const crypto = require('crypto');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getExpirationTime() {
  // Create UTC time (1 hour from now)
  // This ensures the comparison with PostgreSQL's NOW() (UTC) works correctly
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  return oneHourLater.toISOString(); // Return ISO string for proper UTC handling
}

async function sendMagicLink(email, token, baseUrl) {
  const appBase = baseUrl || process.env.APP_URL || '';
  // Prefer putting the token in the URL fragment so email scanners don't consume it
  const magicLink = `${appBase.replace(/\/$/, '')}/api/verify#token=${token}`;

  console.log('[sendMagicLink] Attempting to send email via Resend:', {
    to: email,
    from: process.env.EMAIL_FROM,
    magicLinkPreview: magicLink.substring(0, 80) + '...'
  });

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Your VERA login link',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to VERA</h2>
          <p>Click the link below to access your account:</p>
          <p>
            <a href="${magicLink}" style="display: inline-block; padding: 12px 24px; background-color: #000; color: #fff; text-decoration: none; border-radius: 4px;">
              Access VERA
            </a>
          </p>
          <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    });
    console.log('[sendMagicLink] Email sent successfully:', {
      id: result?.id,
      from: result?.from,
      to: result?.to
    });
    return result;
  } catch (error) {
    console.error('[sendMagicLink] RESEND EMAIL FAILED:', {
      message: error.message,
      code: error.code,
      status: error.status,
      name: error.name,
      resendError: error.body || error.response || 'No additional details'
    });
    throw error;
  }
}

module.exports = {
  generateToken,
  getExpirationTime,
  sendMagicLink
};
