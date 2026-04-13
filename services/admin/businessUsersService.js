const db = require('../../db');
const userAdminService = require('../userAdminService');
const { createError } = require('./errors');

async function createUserForBusiness(businessId, { email, password, role }) {
  if (!businessId) {
    throw createError('businessId is required', 'BUSINESS_ID_REQUIRED', 400);
  }

  const business = await db.query('SELECT id FROM businesses WHERE id = $1 LIMIT 1', [businessId]);
  if (business.rows.length === 0) {
    throw createError('business not found', 'BUSINESS_NOT_FOUND', 404);
  }

  return userAdminService.createBusinessUser(businessId, {
    email,
    password,
    role
  });
}

async function updateUserStatusForBusiness(businessId, userId, isActive) {
  if (!businessId) {
    throw createError('businessId is required', 'BUSINESS_ID_REQUIRED', 400);
  }

  const business = await db.query('SELECT id FROM businesses WHERE id = $1 LIMIT 1', [businessId]);
  if (business.rows.length === 0) {
    throw createError('business not found', 'BUSINESS_NOT_FOUND', 404);
  }

  return userAdminService.updateUserStatusByBusinessId(businessId, userId, isActive);
}

module.exports = {
  createUserForBusiness,
  updateUserStatusForBusiness
};
