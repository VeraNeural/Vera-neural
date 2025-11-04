const { createCheckoutSession } = require('../lib/stripe');
const { getUserByEmail, createUser } = require('../lib/database');
const { capturePaymentError, setUserContext } = require('../lib/sentry-config');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, phone_number, plan } = req.body;

    if (!email || !plan) {
      return res.status(400).json({ error: 'Email and plan required' });
    }

    // Set user context for Sentry
    setUserContext(email);

    // Validate plan
    if (!['monthly', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be "monthly" or "annual"' });
    }

    // Get or create user
    let user = await getUserByEmail(email);
    if (!user) {
      user = await createUser(email);
    }

    // Update phone if provided
    if (phone_number && !user.phone_number) {
      const { pool } = require('../lib/database');
      const result = await pool.query(
        'UPDATE users SET phone_number = $1 WHERE email = $2 RETURNING *',
        [phone_number.replace(/\D/g, ''), email]
      );
      user = result.rows[0];
    }

    // Create checkout session with correct price ID
    const session = await createCheckoutSession(email, user.id, plan);

    res.status(200).json({ 
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('❌ Checkout error:', error);
    
    // Capture payment error with context
    capturePaymentError(error, {
      email: req.body?.email,
      plan: req.body?.plan,
      service: 'stripe',
      errorCode: error.code,
    });

    res.status(500).json({ error: 'Internal server error' });
  }
};

