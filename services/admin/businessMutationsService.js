const db = require('../../db');
const { createError } = require('./errors');

async function updateBusinessStatus(businessId, isActive) {
  if (!businessId) {
    throw createError('businessId is required', 'BUSINESS_ID_REQUIRED', 400);
  }

  if (typeof isActive !== 'boolean') {
    throw createError('is_active must be a boolean', 'INVALID_STATUS', 400);
  }

  const result = await db.query(
    `UPDATE businesses
     SET is_active = $2
     WHERE id = $1
     RETURNING id, name, phone_number, is_active, created_at`,
    [businessId, isActive]
  );

  if (result.rows.length === 0) {
    throw createError('business not found', 'BUSINESS_NOT_FOUND', 404);
  }

  return result.rows[0];
}

async function updateBusinessById(businessId, { name, phone_number: phoneNumber }) {
  if (!businessId) {
    throw createError('businessId is required', 'BUSINESS_ID_REQUIRED', 400);
  }

  const normalizedName = typeof name === 'string' ? name.trim() : null;
  const normalizedPhone = typeof phoneNumber === 'string' ? phoneNumber.trim() : null;

  if (normalizedName === '') {
    throw createError('name cannot be empty', 'INVALID_NAME', 400);
  }

  const result = await db.query(
    `UPDATE businesses
     SET
       name = COALESCE($2, name),
       phone_number = COALESCE($3, phone_number)
     WHERE id = $1
     RETURNING id, name, phone_number, is_active, created_at`,
    [businessId, normalizedName, normalizedPhone]
  );

  if (result.rows.length === 0) {
    throw createError('business not found', 'BUSINESS_NOT_FOUND', 404);
  }

  return result.rows[0];
}

module.exports = {
  updateBusinessStatus,
  updateBusinessById
};
