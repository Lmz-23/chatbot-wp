const authService = require('../services/authService');
const logger = require('../utils/logger');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'missing_token' });
  }

  try {
    const decoded = authService.verifyToken(token);
    req.user = {
      userId: decoded.userId,
      platformRole: decoded.platformRole || null,
      businessId: decoded.businessId || null,
      businessRole: decoded.businessRole || null
    };
    return next();
  } catch (err) {
    logger.warn('auth_token_invalid', { err: err && err.message ? err.message : err });
    return res.status(401).json({ error: 'invalid_token' });
  }
}

function requirePlatformAdmin(req, res, next) {
  if (!req.user || req.user.platformRole !== 'PLATFORM_ADMIN') {
    return res.status(403).json({ error: 'forbidden' });
  }
  return next();
}

function requireBusinessRole(roles) {
  return function (req, res, next) {
    if (!req.user || !req.user.businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (!roles.includes(req.user.businessRole)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    return next();
  };
}

module.exports = { authenticateToken, requirePlatformAdmin, requireBusinessRole };
