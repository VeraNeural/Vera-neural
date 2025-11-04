/**
 * API: /api/auth/validate-session
 * Validates user session by checking email + session token
 * Used by vera-pro.html to verify user is still authenticated
 * 
 * Request: POST with {email, sessionToken}
 * Response: {valid: true/false, user: {...}}
 */

const { getUserByEmail } = require('../../lib/database');
const crypto = require('crypto');

// In-memory session store (in production, use Redis or database)
// Key: email, Value: {token, expiresAt, createdAt}
const sessionStore = new Map();

// Session validity: 7 days
const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a new session token for a user
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a session for a user
 */
function createSession(email) {
  const token = generateSessionToken();
  const now = Date.now();
  
  sessionStore.set(email, {
    token,
    expiresAt: now + SESSION_EXPIRY_MS,
    createdAt: now
  });

  console.log(`✅ Session created for ${email}, expires in 7 days`);
  return token;
}

/**
 * Validate a session token
 */
function validateSessionToken(email, token) {
  const session = sessionStore.get(email);
  
  if (!session) {
    console.warn(`⚠️  No session found for ${email}`);
    return false;
  }

  if (session.token !== token) {
    console.warn(`⚠️  Invalid token for ${email}`);
    return false;
  }

  if (Date.now() > session.expiresAt) {
    console.warn(`⚠️  Session expired for ${email}`);
    sessionStore.delete(email);
    return false;
  }

  console.log(`✅ Session valid for ${email}`);
  return true;
}

/**
 * Revoke a session
 */
function revokeSession(email) {
  sessionStore.delete(email);
  console.log(`🔒 Session revoked for ${email}`);
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, email, sessionToken } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'action required (create, validate, or revoke)' });
    }

    if (!email) {
      return res.status(400).json({ error: 'email required' });
    }

    // Get user to verify they exist
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // CREATE: Generate new session token after successful authentication
    if (action === 'create') {
      const token = createSession(email);
      return res.status(200).json({
        success: true,
        sessionToken: token,
        expiresIn: SESSION_EXPIRY_MS,
        user: {
          id: user.id,
          email: user.email,
          subscriptionStatus: user.subscription_status
        }
      });
    }

    // VALIDATE: Check if session is still valid
    if (action === 'validate') {
      if (!sessionToken) {
        return res.status(400).json({ error: 'sessionToken required for validation' });
      }

      const isValid = validateSessionToken(email, sessionToken);
      
      if (!isValid) {
        return res.status(401).json({
          valid: false,
          error: 'Invalid or expired session'
        });
      }

      return res.status(200).json({
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          subscriptionStatus: user.subscription_status,
          trialEnd: user.trial_end,
          createdAt: user.created_at
        }
      });
    }

    // REVOKE: Log out user (delete session)
    if (action === 'revoke') {
      revokeSession(email);
      return res.status(200).json({
        success: true,
        message: 'Session revoked'
      });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (error) {
    console.error('❌ Error in validate-session:', error.message);
    return res.status(500).json({
      error: error.message || 'Failed to validate session'
    });
  }
};

// Export utilities for use in other endpoints
module.exports.createSession = createSession;
module.exports.validateSessionToken = validateSessionToken;
module.exports.revokeSession = revokeSession;
module.exports.SESSION_EXPIRY_MS = SESSION_EXPIRY_MS;
