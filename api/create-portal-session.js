const handler = require('./portal');

module.exports = async (req, res) => {
  return handler(req, res);
};
