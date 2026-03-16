const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userService = require('./userService');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.verify(token, JWT_SECRET);
}

async function login(email, password) {
  const user = await userService.findByEmail(email);
  if (!user) {
    const err = new Error('INVALID_CREDENTIALS');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('INVALID_CREDENTIALS');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const payload = {
    userId: user.id,
    role: user.platform_role,
    businessId: user.business_id || null
  };

  const token = generateToken(payload);
  return { token, userId: user.id, role: user.platform_role, businessId: payload.businessId };
}

module.exports = { login, generateToken, verifyToken };
