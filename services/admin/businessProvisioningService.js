const bcrypt = require('bcrypt');
const db = require('../../db');
const { defaultAdminBotFlowNodes } = require('../../db/models');
const { DEFAULT_BOT_MESSAGES } = require('../defaultMessages');
const { createError } = require('./errors');

function normalizeEmail(email) {
  return (email || '').toString().trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function createBusinessWithOwner({
  name,
  phone_number: phoneNumber,
  owner_email: ownerEmail,
  owner_password: ownerPassword
}) {
  const normalizedName = (name || '').toString().trim();
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);

  if (!normalizedName) {
    throw createError('name is required', 'NAME_REQUIRED', 400);
  }

  if (!normalizedOwnerEmail) {
    throw createError('owner_email is required', 'OWNER_EMAIL_REQUIRED', 400);
  }

  if (!isValidEmail(normalizedOwnerEmail)) {
    throw createError('owner_email inválido', 'INVALID_OWNER_EMAIL', 400);
  }

  if (!ownerPassword || typeof ownerPassword !== 'string' || ownerPassword.length < 8) {
    throw createError('owner_password must be at least 8 characters', 'OWNER_PASSWORD_INVALID', 400);
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const existingOwner = await client.query(
      `SELECT id
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [normalizedOwnerEmail]
    );

    if (existingOwner.rows.length > 0) {
      throw createError('owner_email ya registrado', 'OWNER_EMAIL_TAKEN', 409);
    }

    const businessResult = await client.query(
      `INSERT INTO businesses (name, phone_number, is_active)
       VALUES ($1, $2, true)
       RETURNING id, name, phone_number, is_active, created_at`,
      [normalizedName, phoneNumber || null]
    );

    const business = businessResult.rows[0];
    const passwordHash = await bcrypt.hash(ownerPassword, 10);

    const ownerResult = await client.query(
      `INSERT INTO users (email, password_hash, is_active, platform_role)
       VALUES ($1, $2, true, 'USER')
       RETURNING id, email, is_active, platform_role, created_at`,
      [normalizedOwnerEmail, passwordHash]
    );

    const owner = ownerResult.rows[0];

    await client.query(
      `INSERT INTO memberships (user_id, business_id, role)
       VALUES ($1, $2, 'OWNER')`,
      [owner.id, business.id]
    );

    await client.query(
      `INSERT INTO business_settings (
         business_id,
         welcome_message,
         pricing_message,
         lead_capture_message,
         fallback_message
       )
       VALUES (
         $1,
         $2,
         $3,
         $4,
         $5
       )
       ON CONFLICT (business_id) DO NOTHING`,
      [
        business.id,
        DEFAULT_BOT_MESSAGES.welcome_message,
        DEFAULT_BOT_MESSAGES.pricing_message,
        DEFAULT_BOT_MESSAGES.lead_capture_message,
        DEFAULT_BOT_MESSAGES.fallback_message
      ]
    );

    await client.query(
      `INSERT INTO bot_flows (business_id, nodes, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (business_id)
       DO UPDATE SET
         nodes = EXCLUDED.nodes,
         updated_at = now()`,
      [business.id, JSON.stringify(defaultAdminBotFlowNodes)]
    );

    await client.query('COMMIT');

    return { business, owner };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createBusinessWithOwner
};
