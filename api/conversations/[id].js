// /api/conversations/:id -> GET messages, DELETE conversation
const conversations = require('../conversations');

module.exports = async (req, res) => {
  // Ensure req.params.id is present for shared handler compatibility
  req.params = req.params || {};
  if (!req.params.id && req.query && req.query.id) {
    req.params.id = req.query.id;
  }
  if (req.method === 'GET') {
    return conversations.get(req, res);
  }
  if (req.method === 'DELETE') {
    return conversations.remove(req, res);
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(405).json({ error: 'Method not allowed' });
};
