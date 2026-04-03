const userAdminService = require('../services/userAdminService');
const logger = require('../utils/logger');

function getBusinessIdFromUser(req) {
  return req.user && req.user.businessId ? req.user.businessId : null;
}

function normalizeRole(role) {
  return (role || '').toString().trim().toUpperCase();
}

async function listUsers(req, res) {
  try {
    const businessId = getBusinessIdFromUser(req);
    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const users = await userAdminService.getUsersByBusinessId(businessId);
    return res.status(200).json({ ok: true, users });
  } catch (err) {
    logger.error('list_users_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function createUser(req, res) {
  try {
    const businessId = getBusinessIdFromUser(req);
    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { email, password, role } = req.body || {};
    const normalizedRole = normalizeRole(role);

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'email is required' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    if (!['OWNER', 'AGENT'].includes(normalizedRole)) {
      return res.status(400).json({ error: 'role must be OWNER or AGENT' });
    }

    const createdUser = await userAdminService.createBusinessUser(businessId, {
      email,
      password,
      role: normalizedRole
    });

    return res.status(201).json({
      ok: true,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        platform_role: createdUser.platform_role,
        is_active: createdUser.is_active,
        created_at: createdUser.created_at
      }
    });
  } catch (err) {
    if (err.code === 'EMAIL_TAKEN') {
      return res.status(409).json({ error: 'email ya registrado' });
    }

    if (err.code === 'INVALID_ROLE') {
      return res.status(400).json({ error: 'role must be OWNER or AGENT' });
    }

    logger.error('create_user_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function updateUserStatus(req, res) {
  try {
    const businessId = getBusinessIdFromUser(req);
    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const targetUserId = req.params.userId;
    const { is_active: isActive } = req.body || {};

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    if (String(targetUserId) === String(req.user.userId) && isActive === false) {
      return res.status(403).json({ error: 'No puedes desactivar tu propia cuenta' });
    }

    const updatedUser = await userAdminService.updateUserStatusByBusinessId(
      businessId,
      targetUserId,
      isActive,
      req.user.userId
    );

    return res.status(200).json({
      ok: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        platform_role: updatedUser.platform_role,
        is_active: updatedUser.is_active,
        created_at: updatedUser.created_at
      }
    });
  } catch (err) {
    if (err.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'user not found' });
    }

    if (err.code === 'SELF_DEACTIVATION_FORBIDDEN') {
      return res.status(403).json({ error: 'No puedes desactivar tu propia cuenta' });
    }

    logger.error('update_user_status_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function updateUserPassword(req, res) {
  try {
    const businessId = getBusinessIdFromUser(req);
    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const targetUserId = req.params.userId;
    const currentUserId = req.user.userId;
    const isOwner = req.user.businessRole === 'OWNER';
    const isSelfChange = String(targetUserId) === String(currentUserId);
    const { currentPassword, newPassword } = req.body || {};

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'newPassword must be at least 8 characters' });
    }

    if (!isSelfChange && !isOwner) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (isSelfChange && (!currentPassword || typeof currentPassword !== 'string')) {
      return res.status(400).json({ error: 'currentPassword is required' });
    }

    await userAdminService.updateUserPasswordByBusinessId({
      businessId,
      requestingUserId: currentUserId,
      targetUserId,
      currentPassword,
      newPassword,
      isOwner
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    if (err.code === 'USER_NOT_FOUND') {
      return res.status(404).json({ error: 'user not found' });
    }

    if (err.code === 'CURRENT_PASSWORD_REQUIRED') {
      return res.status(400).json({ error: 'currentPassword is required' });
    }

    if (err.code === 'INVALID_CURRENT_PASSWORD') {
      return res.status(400).json({ error: 'currentPassword is invalid' });
    }

    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ error: 'forbidden' });
    }

    logger.error('update_user_password_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUserStatus,
  updateUserPassword
};