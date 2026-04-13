const { login } = require('./auth/loginService');
const { register } = require('./auth/registerService');
const { generateToken, verifyToken } = require('./auth/tokenService');

module.exports = {
  login,
  generateToken,
  verifyToken,
  register
};
