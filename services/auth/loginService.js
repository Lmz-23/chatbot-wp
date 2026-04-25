const bcrypt = require('bcrypt');
const userService = require('../userService');
const db = require('../../db');
const { createAuthError } = require('./errorFactory');
const { buildTokenPayload, generateToken } = require('./tokenService');

async function assertBusinessActiveIfTenantUser(user) {
  const isPlatformAdmin = user.platform_role === 'PLATFORM_ADMIN';
  const hasTenantMembership = user.membership_role === 'OWNER' || user.membership_role === 'AGENT';

  if (!isPlatformAdmin && hasTenantMembership && user.business_id) {
    const businessResult = await db.query(
      `SELECT is_active
       FROM businesses
       WHERE id = $1
       LIMIT 1`,
      [user.business_id]
    );

    const business = businessResult.rows[0] || null;
    if (business && business.is_active === false) {
      throw createAuthError('BUSINESS_SUSPENDED');
    }
  }
}

async function login(email, password) {
  const user = await userService.findByEmail(email);
  if (!user) {
    throw createAuthError('EMAIL_NOT_FOUND');
  }

  if (user.is_active === false) {
    throw createAuthError('ACCOUNT_DISABLED');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw createAuthError('INVALID_PASSWORD');
  }

  await assertBusinessActiveIfTenantUser(user);

  const payload = buildTokenPayload({
    userId: user.id,
    platformRole: user.platform_role,
    businessId: user.business_id || null,
    businessRole: user.membership_role || null
  });

  const token = generateToken(payload);
  return {
    token,
    userId: user.id,
    platformRole: payload.platformRole,
    businessId: payload.businessId,
    businessRole: payload.businessRole
  };
}

module.exports = {
  login
};
