const {
  getUserByEmail,
  createUser,
  getConversationsByUser,
  getConversationMessagesForUser,
  deleteConversationForUser
} = require('../lib/database');

function deriveEmail(email, anonId) {
  if (email && String(email).trim()) return String(email).trim();
  if (anonId && typeof anonId === 'string') return `guest.${anonId}@guest.local`;
  return 'guest@temp.local';
}

module.exports = {
  list: async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
      const email = req.query && req.query.email ? String(req.query.email) : null;
      const anonId = req.query && req.query.anonId ? String(req.query.anonId) : null;
      const effectiveEmail = deriveEmail(email, anonId);

      let user = await getUserByEmail(effectiveEmail);
      if (!user) {
        user = await createUser(effectiveEmail);
      }

      const rows = await getConversationsByUser(user.id, 100);
      return res.status(200).json({ conversations: rows });
    } catch (err) {
      console.error('conversations.list error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
  get: async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: 'Conversation id required' });
      const email = req.query && req.query.email ? String(req.query.email) : null;
      const anonId = req.query && req.query.anonId ? String(req.query.anonId) : null;
      const effectiveEmail = deriveEmail(email, anonId);

      let user = await getUserByEmail(effectiveEmail);
      if (!user) {
        user = await createUser(effectiveEmail);
      }

      const messages = await getConversationMessagesForUser(user.id, id);
      return res.status(200).json({ messages });
    } catch (err) {
      console.error('conversations.get error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
  remove: async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

    try {
      const id = Number(req.params.id);
      if (!id) return res.status(400).json({ error: 'Conversation id required' });
      const email = req.query && req.query.email ? String(req.query.email) : null;
      const anonId = req.query && req.query.anonId ? String(req.query.anonId) : null;
      const effectiveEmail = deriveEmail(email, anonId);

      let user = await getUserByEmail(effectiveEmail);
      if (!user) {
        user = await createUser(effectiveEmail);
      }

      const ok = await deleteConversationForUser(user.id, id);
      return res.status(200).json({ success: ok });
    } catch (err) {
      console.error('conversations.remove error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};
