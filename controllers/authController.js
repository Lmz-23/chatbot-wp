const authService = require('../services/authService');
const userService = require('../services/userService');
const membershipService = require('../services/membershipService');
const logger = require('../utils/logger');

function buildAuthFailureBody(error, debugCode) {
  const debugEnabled = String(process.env.AUTH_LOGIN_DEBUG || '').toLowerCase() === 'true';
  if (!debugEnabled) {
    return { error };
  }

  return {
    error,
    debug: {
      code: debugCode,
      note: 'AUTH_LOGIN_DEBUG habilitado; desactivalo en produccion'
    }
  };
}

// Validates credentials and issues a JWT for dashboard access.
async function login(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'password is required' });
    }

    const result = await authService.login(email.trim().toLowerCase(), password);
    return res.status(200).json({ ok: true, token: result.token });
  } catch (err) {
    const message = err && err.message ? String(err.message) : '';

    if (err.code === 'ACCOUNT_DISABLED') {
      return res.status(403).json({ error: 'Tu cuenta ha sido desactivada. Contacta al administrador.' });
    }

    if (err.code === 'BUSINESS_SUSPENDED') {
      return res.status(403).json({ error: 'Tu acceso ha sido suspendido. Contacta al administrador de la plataforma.' });
    }

    if (err.code === 'EMAIL_NOT_FOUND') {
      return res.status(401).json(buildAuthFailureBody('correo no registrado', 'EMAIL_NOT_FOUND'));
    }

    if (err.code === 'INVALID_PASSWORD') {
      return res.status(401).json(buildAuthFailureBody('contrasena incorrecta', 'INVALID_PASSWORD'));
    }

    if (err.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json(buildAuthFailureBody('credenciales invalidas', 'INVALID_CREDENTIALS'));
    }

    if (/password authentication failed/i.test(message)) {
      return res.status(500).json({ error: 'db_auth_failed' });
    }

    if (/getaddrinfo|ENOTFOUND|ECONNREFUSED|ECONNRESET/i.test(message)) {
      return res.status(500).json({ error: 'db_connection_failed' });
    }

    logger.error('login_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

// Returns the authenticated user profile and current business membership.
async function me(req, res) {
  try {
    const user = await userService.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }

    return res.status(200).json({
      ok: true,
      userId: user.id,
      email: user.email,
      platformRole: user.platform_role,
      businessId: user.business_id || null,
      businessRole: user.membership_role || null
    });
  } catch (err) {
    logger.error('me_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

// Lists businesses linked to the authenticated user.
async function getUserBusinesses(req, res) {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: 'missing_token' });
    }

    const businesses = await membershipService.getBusinessesByUser(req.user.userId);
    return res.status(200).json({ ok: true, businesses });
  } catch (err) {
    logger.error('get_user_businesses_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

// Creates a new tenant owner account and returns an auth token.
async function register(req, res) {
  try {
    const { email, password, businessName } = req.body || {};

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'email inválido' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'password debe tener mínimo 6 caracteres' });
    }

    if (!businessName || typeof businessName !== 'string' || businessName.trim().length === 0) {
      return res.status(400).json({ error: 'businessName es requerido' });
    }

    const result = await authService.register({
      email: email.trim().toLowerCase(),
      password,
      businessName: businessName.trim()
    });

    return res.status(201).json({ ok: true, token: result.token });
  } catch (err) {
    if (err.code === 'EMAIL_TAKEN') {
      return res.status(400).json({ error: 'email ya registrado' });
    }
    logger.error('register_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { login, me, getUserBusinesses, register };
