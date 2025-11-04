const handler = require('./auth');

module.exports = async (req, res) => {
  // simple proxy to existing auth endpoint
  return handler(req, res);
};
