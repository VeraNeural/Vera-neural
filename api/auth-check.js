const { getUserByEmail } = require('../lib/database');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const email = req.query && req.query.email ? String(req.query.email) : null;
    if (!email) return res.status(200).json({ authenticated: false });

    const user = await getUserByEmail(email);
    if (!user) return res.status(200).json({ authenticated: false });

    return res.status(200).json({
      authenticated: true,
      email: user.email,
      isSubscriber: user.subscription_status === 'active'
    });
  } catch (err) {
    console.error('auth-check error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
