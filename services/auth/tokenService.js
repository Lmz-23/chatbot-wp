const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function buildTokenPayload({ userId, platformRole, businessId = null, businessRole = null }) {
  return {
    userId,
    platformRole,
    businessId,
    businessRole
  };
}

function generateToken(payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  buildTokenPayload,
  generateToken,
  verifyToken
};
