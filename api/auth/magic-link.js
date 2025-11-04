// Magic link authentication API
// Handles: signup email submission and magic link verification

const crypto = require('crypto');
const nodemailer = require('nodemailer');

// In-memory token store (replace with database in production)
const trialTokens = new Map();

// Email configuration (replace with your email service)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * POST /api/auth/send-trial-magic-link
 * Sends a magic link to the user's email
 */
async function sendTrialMagicLink(req, res) {
  try {
    const { email } = req.body;

    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token with email (in production, save to database)
    trialTokens.set(token, {
      email,
      createdAt: new Date(),
      expiresAt,
      used: false
    });

    // Generate magic link
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const magicLink = `${appUrl}/api/auth/verify-trial-link?token=${token}`;

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: '✨ Your VERA 48-Hour Trial Magic Link',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #9B59B6; margin: 0; font-size: 2.5rem; letter-spacing: 0.15em;">VERA</h1>
            <p style="color: #666; margin: 10px 0 0 0; font-size: 1.1rem;">Your AI Co-Regulator</p>
          </div>

          <div style="background: linear-gradient(135deg, rgba(155, 89, 182, 0.1) 0%, rgba(100, 181, 246, 0.1) 100%); border-radius: 12px; padding: 30px; margin-bottom: 20px; border: 1px solid rgba(155, 89, 182, 0.2);">
            <h2 style="color: #333; margin-top: 0; font-size: 1.5rem;">Welcome to Your 48-Hour Free Trial!</h2>
            
            <p style="color: #555; line-height: 1.6; font-size: 1.05rem; margin: 15px 0;">
              Click the link below to start your 48-hour free trial with VERA. This link expires in 24 hours.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #9B59B6, #64B5F6); color: white; padding: 14px 40px; text-decoration: none; border-radius: 50px; font-weight: 600; font-size: 1.1rem; box-shadow: 0 4px 20px rgba(155, 89, 182, 0.3);">
                ✨ Start Your Trial
              </a>
            </div>

            <p style="color: #888; font-size: 0.9rem; text-align: center; margin: 20px 0 0 0;">
              Or copy this link:<br>
              <code style="background: #f5f5f5; padding: 10px; display: inline-block; margin-top: 8px; border-radius: 4px; font-size: 0.85rem; word-break: break-all;">
                ${magicLink}
              </code>
            </p>
          </div>

          <div style="background: #f9f9f9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0; font-size: 1.1rem;">What's Included:</h3>
            <ul style="color: #555; line-height: 1.8; margin: 10px 0; padding-left: 25px;">
              <li>Full access to VERA's nervous system co-regulation</li>
              <li>Real-time guidance and support</li>
              <li>Personalized breathing sessions</li>
              <li>All premium features unlocked</li>
            </ul>
          </div>

          <div style="border-top: 1px solid #eee; padding-top: 20px; font-size: 0.9rem; color: #999;">
            <p style="margin: 10px 0;">
              <strong>Trial expires in 48 hours.</strong> After your trial ends, you'll have the option to upgrade to our paid plans.
            </p>
            <p style="margin: 10px 0;">
              <strong>Questions?</strong> Reply to this email or visit our help center.
            </p>
            <p style="margin: 20px 0 0 0;">
              Warm regards,<br>
              <strong>The VERA Team</strong>
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Magic link sent to ${email}`);
    return res.json({ 
      success: true, 
      message: 'Magic link sent to your email. Check your inbox!' 
    });

  } catch (error) {
    console.error('❌ Error sending magic link:', error);
    return res.status(500).json({ 
      error: 'Failed to send magic link. Please try again.' 
    });
  }
}

/**
 * GET /api/auth/verify-trial-link?token=xxx
 * Verifies the magic link token and activates trial
 */
async function verifyTrialLink(req, res) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Missing token' });
    }

    // Check if token exists and is valid
    const tokenData = trialTokens.get(token);

    if (!tokenData) {
      return res.status(400).json({ error: 'Invalid or expired link' });
    }

    if (tokenData.used) {
      return res.status(400).json({ error: 'This link has already been used' });
    }

    if (new Date() > tokenData.expiresAt) {
      trialTokens.delete(token);
      return res.status(400).json({ error: 'Link has expired. Please sign up again.' });
    }

    // Mark token as used
    tokenData.used = true;

    // In production, save to database:
    // await db.users.create({
    //   email: tokenData.email,
    //   trialStartedAt: new Date(),
    //   trialEndsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    //   subscription_status: 'trial'
    // });

    console.log(`✅ Trial activated for ${tokenData.email}`);

    // Redirect to chat app with email and trial data in URL
    const trialEndTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const redirectUrl = `/vera-pro.html?email=${encodeURIComponent(tokenData.email)}&trial=true&trialEnd=${trialEndTime.getTime()}`;
    
    return res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Error verifying trial link:', error);
    return res.status(500).json({ 
      error: 'Failed to verify link. Please try again.' 
    });
  }
}

module.exports = {
  sendTrialMagicLink,
  verifyTrialLink
};
