const { generateToken, getExpirationTime, sendMagicLink } = require('../lib/auth');
const { createUser, createMagicLink } = require('../lib/database');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    console.log('[auth] ========== MAGIC LINK REQUEST START ==========');
    console.log('[auth] Email:', email);
    console.log('[auth] Req.body:', JSON.stringify(req.body));
    console.log('[auth] Environment check:', {
      hasResendKey: !!process.env.RESEND_API_KEY,
      emailFromAddr: process.env.EMAIL_FROM,
      databaseUrl: process.env.POSTGRES_URL_NON_POOLING ? 'configured' : 'NOT SET'
    });

    console.log('[auth] Step 1: Creating user for email:', email);
    const userResult = await createUser(email);
    console.log('[auth] Step 1 SUCCESS - User created:', {
      userId: userResult?.id,
      userEmail: userResult?.email,
      subscriptionStatus: userResult?.subscription_status
    });

    const token = generateToken();
    const expiresAt = getExpirationTime();
    console.log('[auth] Step 2: Generated token:', {
      tokenLength: token.length,
      expiresAt: expiresAt,
      expiresAtType: typeof expiresAt
    });

    console.log('[auth] Step 3: Saving magic link to database');
    const magicLinkRecord = await createMagicLink(email, token, expiresAt);
    console.log('[auth] Step 3 SUCCESS - Magic link saved:', {
      id: magicLinkRecord?.id,
      email: magicLinkRecord?.email,
      tokenLength: magicLinkRecord?.token?.length,
      expiresAt: magicLinkRecord?.expires_at,
      used: magicLinkRecord?.used
    });

    // Build base URL from request for correct environment (local vs vercel)
    const host = req.headers.host;
    const proto = (req.headers['x-forwarded-proto'] || '').toString() || (host && host.includes('localhost') ? 'http' : 'https');
    const baseUrl = host ? `${proto}://${host}` : process.env.APP_URL;

    console.log('[auth] Step 4: Sending email via Resend');
    console.log('[auth] Email details:', {
      to: email,
      from: process.env.EMAIL_FROM,
      baseUrl: baseUrl
    });

    await sendMagicLink(email, token, baseUrl);
    console.log('[auth] Step 4 SUCCESS - Email sent');

    console.log('[auth] ========== MAGIC LINK REQUEST SUCCESS ==========');
    res.status(200).json({ 
      success: true,
      message: 'Magic link sent to your email'
    });

  } catch (error) {
    console.error('[auth] ========== MAGIC LINK REQUEST FAILED ==========');
    console.error('[auth] ERROR DETAILS:', {
      message: error.message,
      code: error.code,
      status: error.status,
      name: error.name,
      detail: error.detail,
      stack: error.stack,
      fullError: JSON.stringify(error, null, 2)
    });
    console.error('[auth] Sent response: 500 Internal Server Error');
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
