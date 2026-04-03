const bcrypt = require('bcrypt');
const db = require('../db');

function createError(message, code, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function normalizeEmail(email) {
  return (email || '').toString().trim().toLowerCase();
}

function normalizeRole(role) {
  return (role || '').toString().trim().toUpperCase();
}

async function getUsersByBusinessId(businessId) {
  if (!businessId) return [];

  const q = `
    SELECT
      u.id,
      u.email,
      u.platform_role,
      u.is_active,
      u.created_at
    FROM memberships m
    INNER JOIN users u ON u.id = m.user_id
    WHERE m.business_id = $1
    ORDER BY u.created_at DESC`;

  const result = await db.query(q, [businessId]);
  return result.rows;
}

async function findBusinessUserById(businessId, userId) {
  if (!businessId || !userId) return null;

  const q = `
    SELECT
      u.id,
      u.email,
      u.password_hash,
      u.platform_role,
      u.is_active,
      u.created_at,
      m.role AS business_role
    FROM memberships m
    INNER JOIN users u ON u.id = m.user_id
    WHERE m.business_id = $1
      AND u.id = $2
    LIMIT 1`;

  const result = await db.query(q, [businessId, userId]);
  return result.rows[0] || null;
}

async function findBusinessUserByEmail(businessId, email) {
  if (!businessId || !email) return null;

  const q = `
    SELECT
      u.id,
      u.email,
      u.password_hash,
      u.platform_role,
      u.is_active,
      u.created_at,
      m.role AS business_role
    FROM memberships m
    INNER JOIN users u ON u.id = m.user_id
    WHERE m.business_id = $1
      AND LOWER(u.email) = LOWER($2)
    LIMIT 1`;

  const result = await db.query(q, [businessId, email]);
  return result.rows[0] || null;
}

async function createBusinessUser(businessId, { email, password, role }) {
  if (!businessId) {
    throw createError('missing_business_id', 'MISSING_BUSINESS_ID', 400);
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = normalizeRole(role);

  if (!normalizedEmail) {
    throw createError('email is required', 'EMAIL_REQUIRED', 400);
  }

  if (!password || typeof password !== 'string') {
    throw createError('password is required', 'PASSWORD_REQUIRED', 400);
  }

  if (!['OWNER', 'AGENT'].includes(normalizedRole)) {
    throw createError('role must be OWNER or AGENT', 'INVALID_ROLE', 400);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const existingInBusiness = await client.query(
      `
        SELECT u.id
        FROM memberships m
        INNER JOIN users u ON u.id = m.user_id
        WHERE m.business_id = $1
          AND LOWER(u.email) = LOWER($2)
        LIMIT 1`,
      [businessId, normalizedEmail]
    );

    if (existingInBusiness.rows.length > 0) {
      throw createError('email ya registrado en este negocio', 'EMAIL_TAKEN', 409);
    }

    const globalUser = await client.query(
      `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1`,
      [normalizedEmail]
    );

    if (globalUser.rows.length > 0) {
      throw createError('email ya registrado', 'EMAIL_TAKEN', 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const createdUser = await client.query(
      `
        INSERT INTO users (email, password_hash, is_active, platform_role)
        VALUES ($1, $2, true, 'USER')
        RETURNING id, email, platform_role, is_active, created_at`,
      [normalizedEmail, passwordHash]
    );

    const userId = createdUser.rows[0].id;

    await client.query(
      `
        INSERT INTO memberships (user_id, business_id, role)
        VALUES ($1, $2, $3)`,
      [userId, businessId, normalizedRole]
    );

    await client.query('COMMIT');

    return createdUser.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateUserStatusByBusinessId(businessId, targetUserId, isActive, actingUserId) {
  if (!businessId || !targetUserId) {
    throw createError('missing_user_context', 'MISSING_USER_CONTEXT', 400);
  }

  if (actingUserId && String(actingUserId) === String(targetUserId) && isActive === false) {
    throw createError('No puedes desactivar tu propia cuenta', 'SELF_DEACTIVATION_FORBIDDEN', 403);
  }

  const targetUser = await findBusinessUserById(businessId, targetUserId);
  if (!targetUser) {
    throw createError('user not found', 'USER_NOT_FOUND', 404);
  }

  const q = `
    UPDATE users
    SET is_active = $1
    WHERE id = $2
    RETURNING id, email, platform_role, is_active, created_at`;

  const result = await db.query(q, [isActive, targetUserId]);
  return result.rows[0] || null;
}

async function updateUserPasswordByBusinessId({
  businessId,
  requestingUserId,
  targetUserId,
  currentPassword,
  newPassword,
  isOwner
}) {
  if (!businessId || !requestingUserId || !targetUserId) {
    throw createError('missing_user_context', 'MISSING_USER_CONTEXT', 400);
  }

  if (!newPassword || typeof newPassword !== 'string') {
    throw createError('newPassword is required', 'NEW_PASSWORD_REQUIRED', 400);
  }

  if (newPassword.length < 8) {
    throw createError('newPassword must be at least 8 characters', 'NEW_PASSWORD_TOO_SHORT', 400);
  }

  const targetUser = await findBusinessUserById(businessId, targetUserId);
  if (!targetUser) {
    throw createError('user not found', 'USER_NOT_FOUND', 404);
  }

  const isSelfChange = String(requestingUserId) === String(targetUserId);

  if (!isSelfChange && !isOwner) {
    throw createError('forbidden', 'FORBIDDEN', 403);
  }

  if (isSelfChange) {
    if (!currentPassword || typeof currentPassword !== 'string') {
      throw createError('currentPassword is required', 'CURRENT_PASSWORD_REQUIRED', 400);
    }

    const valid = await bcrypt.compare(currentPassword, targetUser.password_hash);
    if (!valid) {
      throw createError('currentPassword is invalid', 'INVALID_CURRENT_PASSWORD', 400);
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db.query(
    `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2`,
    [passwordHash, targetUserId]
  );

  return true;
}

module.exports = {
  getUsersByBusinessId,
  findBusinessUserById,
  findBusinessUserByEmail,
  createBusinessUser,
  updateUserStatusByBusinessId,
  updateUserPasswordByBusinessId
};