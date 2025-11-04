const { getUserByEmail } = require('../lib/database');

module.exports = async (req, res) => {
  // CORS (simple)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const email = (req.query && req.query.email) ? String(req.query.email) : null;
    if (!email) {
      // No email -> treat as guest with no subscription/trial info
      return res.status(200).json({ subscription: { isOnTrial: false, hoursRemaining: 0 } });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(200).json({ subscription: { isOnTrial: false, hoursRemaining: 0 } });
    }
    const now = new Date();
    const end = user.trial_end ? new Date(user.trial_end) : now;
    const diffMs = end - now;
    const hoursRemaining = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
    const isOnTrial = hoursRemaining > 0 && user.subscription_status === 'trial';

    return res.status(200).json({
      subscription: {
        isOnTrial,
        hoursRemaining,
        trialDay: { hoursRemaining }
      }
    });
  } catch (err) {
    console.error('subscription-status error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
