// /api/conversations -> list conversations
const conversations = require('../conversations');

module.exports = async (req, res) => {
  // Delegate to list handler from unified conversations module
  return conversations.list(req, res);
};
