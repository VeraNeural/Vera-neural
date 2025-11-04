// Vercel Serverless Function: Send Magic Link
// POST /api/auth/send-trial-magic-link

const crypto = require('crypto');
const { createMagicLink } = require('../../lib/database');
const { checkEmailRateLimit, checkIpRateLimit } = require('../../lib/rate-limit');

async function sendEmail(email, magicLink) {
  try {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Use Resend via direct HTTP API (no SDK needed)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'VERA <noreply@veraneural.com>',
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
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Resend API error:', data);
      throw new Error(data.message || `Email API failed: ${response.status}`);
    }

    console.log(`✅ Email sent to ${email}, ID:`, data.id);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    throw error;
  }
}

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Validate email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Get client IP for rate limiting
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';

    // Check IP rate limit (10 requests per minute)
    try {
      const ipLimit = await checkIpRateLimit(ip);
      if (!ipLimit.allowed) {
        console.warn(`❌ IP rate limit exceeded: ${ip}`);
        return res.status(429).json({
          error: 'Too many requests from your IP. Please try again later.',
          retryAfter: ipLimit.resetIn,
        });
      }
    } catch (rateLimitError) {
      console.warn(`⚠️ IP rate limit check failed (allowing request): ${rateLimitError.message}`);
    }

    // Check email rate limit (3 emails per hour)
    try {
      const emailLimit = await checkEmailRateLimit(email);
      if (!emailLimit.allowed) {
        console.warn(`❌ Email rate limit exceeded: ${email}`);
        return res.status(429).json({
          error: 'Too many magic links sent to this email. Check your inbox or try again in an hour.',
          retryAfter: emailLimit.resetIn,
        });
      }
    } catch (rateLimitError) {
      console.warn(`⚠️ Email rate limit check failed (allowing request): ${rateLimitError.message}`);
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in database
    try {
      await createMagicLink(email, token, expiresAt.toISOString());
      console.log(`✅ Magic link token created for ${email}`);
    } catch (error) {
      // Check if error is due to duplicate/active link
      if (error.message && error.message.includes('duplicate')) {
        return res.status(429).json({ 
          error: 'A magic link has already been sent to this email. Check your inbox or try again in 24 hours.' 
        });
      }
      throw error;
    }

    // Generate magic link
    const appUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.APP_URL || 'http://localhost:3000';
    
    const magicLink = `${appUrl}/api/auth/verify-trial-link?token=${token}`;

    // Send email with Resend
    await sendEmail(email, magicLink);

    console.log(`✅ Magic link created and email sent to ${email}`);

    return res.status(200).json({ 
      success: true, 
      message: '✨ Check your email to verify so you can start using VERA!' 
    });

  } catch (error) {
    console.error('❌ Error in send-trial-magic-link:', error.message);
    return res.status(500).json({ 
      error: error.message || 'Failed to send magic link. Please try again.' 
    });
  }
};
