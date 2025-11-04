// Vercel Serverless Function: Verify Magic Link & Activate Trial
// GET /api/auth/verify-trial-link?token=xxx

const { getMagicLink, markMagicLinkUsed, getUserByEmail, createUser } = require('../../lib/database');
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const errorPage = (title, message, icon) => `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${title} - VERA</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      .container { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 500px; }
      .error-icon { font-size: 4rem; margin-bottom: 20px; }
      h1 { color: #333; margin: 0 0 10px 0; font-size: 1.8rem; }
      p { color: #666; margin: 15px 0; line-height: 1.6; font-size: 1rem; }
      a { color: #667eea; text-decoration: none; font-weight: 600; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="error-icon">${icon}</div>
      <h1>${title}</h1>
      <p>${message}</p>
      <p><a href="/">← Request a new magic link</a></p>
    </div>
  </body>
  </html>
`;

module.exports = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      console.log('❌ No token provided');
      return res.status(400).send(errorPage(
        'Missing Link',
        'No magic link token provided. Please use the link from your email.',
        '❌'
      ));
    }

    console.log(`🔍 Verifying token: ${token.substring(0, 8)}...`);

    // Check if token exists and is valid in database
    const tokenData = await getMagicLink(token);
    
    if (!tokenData) {
      console.log(`❌ Token not found or expired: ${token.substring(0, 8)}...`);
      return res.status(400).send(errorPage(
        'Invalid or Expired Link',
        'This magic link is invalid, expired, or has already been used.',
        '❌'
      ));
    }

    console.log(`📧 Token found for: ${tokenData.email}`);

    // Mark token as used
    try {
      await markMagicLinkUsed(token);
      console.log(`✅ Token marked as used: ${token.substring(0, 8)}...`);
    } catch (error) {
      console.error('❌ Error marking token as used:', error);
      return res.status(500).send(errorPage(
        'Server Error',
        'Something went wrong while processing your trial link. Please try again.',
        '⚠️'
      ));
    }

    // CRITICAL FIX: Create or update user in database with trial
    // This ensures trial_end is persisted in database, not just URL params
    const { createUser } = require('../../lib/database');
    
    let user = await getUserByEmail(tokenData.email);
    
    if (!user) {
      // NEW USER: Create with 48-hour trial
      console.log(`👤 Creating new user: ${tokenData.email}`);
      user = await createUser(tokenData.email);
      console.log(`✅ New user created with trial_end: ${user.trial_end}`);
    } else {
      // RETURNING USER: Check if trial expired
      const now = new Date();
      const trialEnd = new Date(user.trial_end);
      
      if (now > trialEnd) {
        // Trial expired - grant another 48 hours
        console.log(`⏱️ Trial expired for returning user, extending...`);
        const { pool } = require('../../lib/database');
        const newTrialEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);
        const result = await pool.query(
          `UPDATE users SET trial_end = $1 WHERE email = $2 RETURNING *`,
          [newTrialEnd.toISOString(), tokenData.email]
        );
        user = result.rows[0];
        console.log(`✅ Trial extended for returning user until: ${user.trial_end}`);
      } else {
        // Trial still active
        console.log(`✅ Trial still active for: ${tokenData.email}, expires: ${trialEnd.toISOString()}`);
      }
    }

    // Check user's Stripe subscription status
    let subscription_status = 'trial'; // Default to trial
    let stripe_customer_id = null;

    if (user && user.stripe_customer_id) {
      // Check Stripe for active subscription
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          status: 'active',
          limit: 1
        });

        if (subscriptions.data.length > 0) {
          subscription_status = 'active'; // Paying customer
          stripe_customer_id = user.stripe_customer_id;
          console.log(`💳 User has active Stripe subscription: ${tokenData.email}`);
        }
      } catch (stripeError) {
        console.error('⚠️ Error checking Stripe:', stripeError.message);
        // Fall back to trial if Stripe check fails
      }
    }

    console.log(`🎉 Access granted for ${tokenData.email}: subscription_status=${subscription_status}, trial_end=${user.trial_end}`);

    // FIXED: Always redirect to vera-pro (trial info is in database, not URL)
    // vera-pro.html will validate session and check trial via validateSession() endpoint
    let redirectUrl;
    if (subscription_status === 'active') {
      // Paid customer - give them full access
      redirectUrl = `/vera-pro.html?email=${encodeURIComponent(tokenData.email)}&subscription_status=active`;
    } else {
      // Trial user (new or returning) - redirect to vera-pro, trial is in database
      redirectUrl = `/vera-pro.html?email=${encodeURIComponent(tokenData.email)}&subscription_status=trial`;
    }
    
    console.log(`🔄 Redirecting to: ${redirectUrl}`);
    
    // Use HTML redirect instead of res.redirect() to avoid browser security blocks
    return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <title>Activating Trial...</title>
  <style>
    body {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      color: white;
    }
    .loader {
      text-align: center;
    }
    .spinner {
      border: 3px solid rgba(255,255,255,0.3);
      border-top: 3px solid white;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    a {
      color: white;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>✨ Activating your VERA trial...</p>
    <p><small>If you're not redirected, <a href="${redirectUrl}">click here</a></small></p>
  </div>
  <script>
    // Fallback JavaScript redirect after 500ms
    setTimeout(() => {
      window.location.href = '${redirectUrl}';
    }, 500);
  </script>
</body>
</html>
    `);

  } catch (error) {
    console.error('❌ Error verifying trial link:', error);
    return res.status(500).send(errorPage(
      'Server Error',
      'Something went wrong while processing your trial link. Please try again.',
      '⚠️'
    ));
  }
};
