const authService = require('../services/authService');
const userService = require('../services/userService');
const logger = require('../utils/logger');

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
    if (err.code === 'INVALID_CREDENTIALS') {
      return res.status(401).json({ error: 'invalid email or password' });
    }
    logger.error('login_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

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
      role: user.platform_role,
      businessId: user.business_id || null
    });
  } catch (err) {
    logger.error('me_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { login, me };
