const bcrypt = require('bcrypt');
const db = require('../../db');
const { createError } = require('./errors');

async function deleteBusinessById({ businessId, adminUserId, adminPassword }) {
  if (!businessId) {
    throw createError('businessId is required', 'BUSINESS_ID_REQUIRED', 400);
  }

  if (!adminUserId) {
    throw createError('admin user is required', 'ADMIN_USER_REQUIRED', 400);
  }

  if (!adminPassword || typeof adminPassword !== 'string') {
    throw createError('adminPassword is required', 'ADMIN_PASSWORD_REQUIRED', 400);
  }

  const adminResult = await db.query(
    `SELECT id, password_hash, platform_role
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [adminUserId]
  );

  const admin = adminResult.rows[0] || null;
  if (!admin || admin.platform_role !== 'PLATFORM_ADMIN') {
    throw createError('forbidden', 'FORBIDDEN', 403);
  }

  const validPassword = await bcrypt.compare(adminPassword, admin.password_hash);
  if (!validPassword) {
    throw createError('invalid admin password', 'INVALID_ADMIN_PASSWORD', 403);
  }

  const businessCheck = await db.query('SELECT id, name FROM businesses WHERE id = $1 LIMIT 1', [businessId]);
  if (businessCheck.rows.length === 0) {
    throw createError('business not found', 'BUSINESS_NOT_FOUND', 404);
  }

  const deleted = await db.query(
    `DELETE FROM businesses
     WHERE id = $1
     RETURNING id, name`,
    [businessId]
  );

  return deleted.rows[0];
}

module.exports = {
  deleteBusinessById
};
