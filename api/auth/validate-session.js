/**
 * API: /api/auth/validate-session
 * Validates user session by checking email + session token + subscription status
 * Verifies: session token validity, trial expiry, active Stripe subscription
 * 
 * Request: POST with {email, token} or {email, action, sessionToken}
 * Response: {valid: true/false, trial: bool, subscription_status: string}
 */

const { getUserByEmail, createDatabaseSession, getSessionByToken, revokeSessionByToken } = require('../../lib/database');
const { captureAuthError } = require('../../lib/sentry-config');
const { checkRateLimit } = require('../../lib/rate-limit');
const crypto = require('crypto');

// Session validity: 7 days
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a new session token for a user
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a session for a user (save to database)
 */
async function createSession(email) {
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS).toISOString();
    
    await createDatabaseSession(user.id, token, expiresAt);
    console.log(`✅ Session created for ${email}, expires in 7 days`);
    return token;
  } catch (error) {
    console.error(`❌ Error creating session for ${email}:`, error.message);
    throw error;
  }
}

/**
 * Validate a session token (check database)
 */
async function validateSessionToken(token) {
  try {
    const session = await getSessionByToken(token);
    
    if (!session) {
      console.warn(`⚠️  No session found for token: ${token.substring(0, 8)}...`);
      return null;
    }

    // Session is valid (expiry already checked in getSessionByToken WHERE clause)
    console.log(`✅ Session valid for ${session.email}`);
    return session;
  } catch (error) {
    console.error(`❌ Error validating session:`, error.message);
    throw error;
  }
}

/**
 * Revoke a session
 */
async function revokeSession(token) {
  try {
    await revokeSessionByToken(token);
    console.log(`🔒 Session revoked for token: ${token.substring(0, 8)}...`);
  } catch (error) {
    console.error(`❌ Error revoking session:`, error.message);
    throw error;
  }
}

/**
 * Check Stripe subscription status
 */
async function checkStripeSubscription(user) {
  try {
    if (!user.stripe_customer_id) {
      console.log(`ℹ️  No Stripe customer ID for ${user.email}`);
      return { hasActiveSubscription: false };
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1
    });

    const hasActive = subscriptions.data.length > 0;
    if (hasActive) {
      console.log(`✅ Active Stripe subscription found for ${user.email}`);
      return {
        hasActiveSubscription: true,
        subscription: subscriptions.data[0]
      };
    }

    console.log(`ℹ️  No active Stripe subscription for ${user.email}`);
    return { hasActiveSubscription: false };
  } catch (error) {
    console.error(`❌ Error checking Stripe subscription:`, error.message);
    captureAuthError(error, {
      email: user.email,
      action: 'check_stripe_subscription'
    });
    throw error;
  }
}

/**
 * Check if trial is still valid
 */
function checkTrialStatus(user) {
  if (!user.trial_end) {
    console.log(`ℹ️  No trial end date for ${user.email}`);
    return { trialActive: false };
  }

  const trialEnd = new Date(user.trial_end);
  const now = new Date();
  
  console.log(`🕐 Trial Check for ${user.email}:`);
  console.log(`   - Trial End: ${trialEnd.toISOString()}`);
  console.log(`   - Current Time: ${now.toISOString()}`);
  console.log(`   - Time Remaining: ${Math.floor((trialEnd - now) / 1000 / 60)} minutes`);

  if (now < trialEnd) {
    console.log(`✅ Trial still ACTIVE for ${user.email}, expires: ${trialEnd.toISOString()}`);
    return { trialActive: true, trialEnd: user.trial_end };
  }

  console.log(`❌ Trial EXPIRED for ${user.email}, expired at: ${trialEnd.toISOString()}`);
  return { trialActive: false, trialEnd: user.trial_end };
}

module.exports = async (req, res) => {
  // Set CORS headers at the very beginning (before any logic)
  res.setHeader('Access-Control-Allow-Origin', 'https://veraneural.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Apply rate limiting to prevent brute force (10 validation attempts per minute per IP)
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  
  try {
    const rateLimitResult = await checkRateLimit(clientIp, 10, 60);
    
    if (!rateLimitResult.allowed) {
      console.warn(`⚠️  Rate limit exceeded for IP: ${clientIp}`);
      return res.status(429).json({
        valid: false,
        error: 'Too many validation requests. Please try again later.',
        retryAfter: rateLimitResult.resetIn
      });
    }
  } catch (err) {
    console.warn('Rate limit check failed, continuing without rate limiting:', err.message);
  }

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, email, sessionToken, token } = req.body;

    // Support both 'token' and 'sessionToken' field names
    const tokenValue = sessionToken || token;

    if (!email) {
      return res.status(400).json({ 
        valid: false,
        error: 'email required' 
      });
    }

    // Get user to verify they exist
    const user = await getUserByEmail(email);
    if (!user) {
      console.warn(`❌ User not found: ${email}`);
      captureAuthError(new Error('User not found'), {
        email: email,
        action: 'validate_session'
      });
      return res.status(401).json({ 
        valid: false, 
        error: 'User not found' 
      });
    }

    // CREATE: Generate new session token after successful authentication
    if (action === 'create') {
      const sessionToken = await createSession(email);
      return res.status(200).json({
        success: true,
        sessionToken: sessionToken,
        expiresIn: SESSION_EXPIRY_MS,
        user: {
          id: user.id,
          email: user.email,
          subscriptionStatus: user.subscription_status
        }
      });
    }

    // VALIDATE: Check if session is still valid + check subscription/trial
    if (action === 'validate' || !action) {
      // Token validation FIRST (before trial check)
      if (!tokenValue) {
        return res.status(400).json({ 
          valid: false,
          error: 'token or sessionToken required for validation' 
        });
      }

      const session = await validateSessionToken(tokenValue);
      
      if (!session) {
        return res.status(401).json({
          valid: false,
          error: 'Invalid or expired session'
        });
      }

      // ✅ NOW check trial status AFTER confirming valid session
      // This ensures we have a valid session before checking trial
      const trialResult = checkTrialStatus(session);
      console.log(`[validate-session] Trial Result for ${session.email}:`, trialResult);
      
      // CRITICAL: Check if trial has expired AFTER validating session
      if (!trialResult.trialActive && session.subscription_status !== 'active') {
        console.log(`❌ TRIAL EXPIRED for ${session.email} - trial ended at ${trialResult.trialEnd}`);
        return res.status(401).json({
          valid: false,
          error: 'Trial expired',
          expired: true,
          trial_end: trialResult.trialEnd
        });
      }

      // Session is valid and trial is active (or has active subscription)
      // Check subscription status
      try {
        const stripeResult = await checkStripeSubscription(session);
        
        if (stripeResult.hasActiveSubscription) {
          // Active paid subscription
          return res.status(200).json({
            valid: true,
            trial: false,
            subscription_status: 'active',
            user: {
              id: session.user_id,
              email: session.email,
              subscriptionStatus: session.subscription_status,
              createdAt: session.created_at
            }
          });
        }
      } catch (stripeError) {
        console.warn('Stripe check failed, checking trial status instead');
        captureAuthError(stripeError, {
          email: session.email,
          action: 'validate_session_stripe'
        });
      }

      // Trial is active
      if (trialResult.trialActive) {
        // Trial still valid
        console.log(`[validate-session] ✅ Returning valid=true (trial active) for ${session.email}`);
        return res.status(200).json({
          valid: true,
          trial: true,
          trialEnd: trialResult.trialEnd,
          subscription_status: 'trial',
          user: {
            id: session.user_id,
            email: session.email,
            subscriptionStatus: session.subscription_status,
            createdAt: session.created_at
          }
        });
      }

      // No active subscription or trial
      console.log(`[validate-session] ❌ Returning valid=false (trial expired or no subscription) for ${session.email}`);
      return res.status(401).json({
        valid: false,
        error: 'No active subscription or trial',
        redirect: '/checkout',
        subscription_status: 'expired'
      });
    }

    // REVOKE: Log out user (delete session)
    if (action === 'revoke') {
      if (!tokenValue) {
        return res.status(400).json({ 
          error: 'token or sessionToken required for revoke' 
        });
      }
      await revokeSession(tokenValue);
      return res.status(200).json({
        success: true,
        message: 'Session revoked'
      });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (error) {
    console.error('❌ Error in validate-session:', error.message);
    captureAuthError(error, {
      email: req.body?.email,
      action: 'validate_session_error'
    });
    return res.status(500).json({
      valid: false,
      error: 'Internal server error'
    });
  }
};

// Export utilities for use in other endpoints
module.exports.createSession = createSession;
module.exports.validateSessionToken = validateSessionToken;
module.exports.revokeSession = revokeSession;
module.exports.checkStripeSubscription = checkStripeSubscription;
module.exports.checkTrialStatus = checkTrialStatus;
module.exports.SESSION_EXPIRY_MS = SESSION_EXPIRY_MS;
