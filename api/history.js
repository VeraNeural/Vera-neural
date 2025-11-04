const { getUserByEmail, getRecentMessages } = require('../lib/database');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const email = req.query && req.query.email ? String(req.query.email) : null;
    const anonId = req.query && req.query.anonId ? String(req.query.anonId) : null;

    if (!email) {
      // No email -> we don't persist anon history on server; return empty
      return res.status(200).json({ messages: [] });
    }

    const user = await getUserByEmail(email);
    if (!user) return res.status(200).json({ messages: [] });

    const messages = await getRecentMessages(user.id, 50);
    const payload = messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content, created_at: m.created_at }));
    return res.status(200).json({ messages: payload });
  } catch (err) {
    console.error('history error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
