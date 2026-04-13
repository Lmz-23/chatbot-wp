const authService = require('../services/authService');
const logger = require('../utils/logger');

/**
 * Valida y decodifica el JWT Bearer para poblar req.user.
 * @param {import('express').Request} req - Request de Express.
 * @param {import('express').Response} res - Response de Express.
 * @param {import('express').NextFunction} next - Continuacion del pipeline.
 * @returns {import('express').Response|void} Respuesta 401 o continua al siguiente middleware.
 */
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

/**
 * Exige rol de plataforma PLATFORM_ADMIN.
 * @param {import('express').Request} req - Request de Express con req.user.
 * @param {import('express').Response} res - Response de Express.
 * @param {import('express').NextFunction} next - Continuacion del pipeline.
 * @returns {import('express').Response|void} Respuesta 403 o continua.
 */
function requirePlatformAdmin(req, res, next) {
  if (!req.user || req.user.platformRole !== 'PLATFORM_ADMIN') {
    return res.status(403).json({ error: 'forbidden' });
  }
  return next();
}

/**
 * Crea middleware que exige un rol de negocio permitido.
 * @param {string[]} roles - Lista de roles permitidos (ej: OWNER, AGENT).
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => (import('express').Response|void)} Middleware de autorizacion.
 */
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
