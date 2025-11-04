// Vercel Serverless Function: Verify Magic Link & Activate Trial
// GET /api/auth/verify-trial-link?token=xxx

const { getMagicLink, markMagicLinkUsed, getUserByEmail } = require('../../lib/database');
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

    // Token is valid! Mark as used
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

    // Check user's subscription status
    let user = await getUserByEmail(tokenData.email);
    let subscription_status = 'trial'; // Default to trial for new users
    let stripe_customer_id = null;

    if (user && user.stripe_customer_id) {
      // Check Stripe for active subscription
      try {
        const customer = await stripe.customers.retrieve(user.stripe_customer_id);
        
        // Get subscriptions (any status - we'll handle failed payments gracefully)
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripe_customer_id,
          limit: 10
        });

        if (subscriptions.data.length > 0) {
          const latestSub = subscriptions.data[0];
          
          if (latestSub.status === 'active') {
            subscription_status = 'active'; // Paying customer
            stripe_customer_id = user.stripe_customer_id;
            console.log(`💳 User has active Stripe subscription: ${tokenData.email}`);
          } else if (latestSub.status === 'incomplete' || latestSub.status === 'past_due') {
            // Payment failed - deny access, require payment
            subscription_status = 'payment_failed';
            stripe_customer_id = user.stripe_customer_id;
            console.log(`❌ User has payment issue (${latestSub.status}) - access denied: ${tokenData.email}`);
          } else {
            console.log(`⏱️ No active Stripe subscription for: ${tokenData.email} (status: ${latestSub.status})`);
          }
        } else {
          console.log(`⏱️ No Stripe subscriptions found for: ${tokenData.email}`);
        }
      } catch (stripeError) {
        console.error('⚠️ Error checking Stripe:', stripeError.message);
        // Fall back to trial if Stripe check fails
      }
    }

    // Create trial session (48 hours) - ONLY for new trial users, not for payment_failed
    const trialStart = new Date();
    const trialEnd = new Date(trialStart.getTime() + 48 * 60 * 60 * 1000);

    console.log(`🎉 Access granted for ${tokenData.email}: subscription_status=${subscription_status}`);

    // Redirect to vera-pro with trial parameters and subscription status
    // Only grant 48-hour trial if subscription_status is 'trial' (new user)
    // If payment_failed or other status, don't extend trial
    let redirectUrl;
    if (subscription_status === 'trial') {
      // New trial user - give them 48 hours
      redirectUrl = `/vera-pro.html?email=${encodeURIComponent(tokenData.email)}&trial=true&trialStart=${trialStart.getTime()}&trialEnd=${trialEnd.getTime()}&subscription_status=trial`;
    } else if (subscription_status === 'active') {
      // Paid customer - give them full access
      redirectUrl = `/vera-pro.html?email=${encodeURIComponent(tokenData.email)}&trial=false&subscription_status=active`;
    } else {
      // Payment failed or other issues - redirect to checkout
      redirectUrl = `/checkout?email=${encodeURIComponent(tokenData.email)}&expired=true&reason=payment_required`;
    }
    
    console.log(`🔄 Redirecting to: ${redirectUrl}`);
    
    return res.redirect(302, redirectUrl);

  } catch (error) {
    console.error('❌ Error verifying trial link:', error);
    return res.status(500).send(errorPage(
      'Server Error',
      'Something went wrong while processing your trial link. Please try again.',
      '⚠️'
    ));
  }
};
