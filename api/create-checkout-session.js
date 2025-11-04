const handler = require('./checkout');

module.exports = async (req, res) => {
  return handler(req, res);
};
