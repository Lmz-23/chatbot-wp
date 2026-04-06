const bcrypt = require('bcrypt');
const db = require('../db');
const userAdminService = require('./userAdminService');
const { defaultClinicBotFlowNodes } = require('../db/models');

function createError(message, code, status = 400) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

function normalizeEmail(email) {
  return (email || '').toString().trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function listBusinesses() {
  const q = `
    SELECT
      b.id,
      b.name,
      b.email,
      b.phone_number,
      b.is_active,
      b.created_at,
      COUNT(DISTINCT m.user_id)::int AS users_count,
      COUNT(DISTINCT c.id)::int AS conversations_count,
      MAX(COALESCE(c.last_message_at, c.created_at)) AS last_activity
    FROM businesses b
    LEFT JOIN memberships m ON m.business_id = b.id
    LEFT JOIN whatsapp_accounts w ON w.business_id = b.id
    LEFT JOIN conversations c ON c.whatsapp_account_id = w.id
    GROUP BY b.id
    ORDER BY b.created_at DESC`;

  const result = await db.query(q);
  return result.rows;
}

async function createBusinessWithOwner({
  name,
  email,
  phone_number: phoneNumber,
  owner_email: ownerEmail,
  owner_password: ownerPassword
}) {
  const normalizedName = (name || '').toString().trim();
  const normalizedBusinessEmail = normalizeEmail(email);
  const normalizedOwnerEmail = normalizeEmail(ownerEmail);

  if (!normalizedName) {
    throw createError('name is required', 'NAME_REQUIRED', 400);
  }

  if (!normalizedBusinessEmail) {
    throw createError('email is required', 'EMAIL_REQUIRED', 400);
  }

  if (!isValidEmail(normalizedBusinessEmail)) {
    throw createError('email inválido', 'INVALID_EMAIL', 400);
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
      `INSERT INTO businesses (name, email, phone_number, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id, name, email, phone_number, is_active, created_at`,
      [normalizedName, normalizedBusinessEmail, phoneNumber || null]
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
         'Hola! Soy tu asistente virtual. ¿Cómo puedo ayudarte hoy?',
         'Con gusto. Nuestros precios dependen del servicio y volumen. Si quieres, te comparto una cotización rápida.',
         'Perfecto, uno de nuestros asesores te contactará pronto. ¡Gracias por tu interés!',
         'Gracias por tu mensaje. Ya reviso el contexto de la conversación y te ayudo enseguida.'
       )
       ON CONFLICT (business_id) DO NOTHING`,
      [business.id]
    );

    await client.query(
      `INSERT INTO bot_flows (business_id, nodes, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (business_id)
       DO UPDATE SET
         nodes = EXCLUDED.nodes,
         updated_at = now()`,
      [business.id, JSON.stringify(defaultClinicBotFlowNodes)]
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
     RETURNING id, name, email, phone_number, is_active, created_at`,
    [businessId, isActive]
  );

  if (result.rows.length === 0) {
    throw createError('business not found', 'BUSINESS_NOT_FOUND', 404);
  }

  return result.rows[0];
}

async function getBusinessById(businessId) {
  if (!businessId) {
    throw createError('businessId is required', 'BUSINESS_ID_REQUIRED', 400);
  }

  const businessResult = await db.query(
    `SELECT id, name, email, phone_number, is_active, created_at
     FROM businesses
     WHERE id = $1
     LIMIT 1`,
    [businessId]
  );

  const business = businessResult.rows[0] || null;
  if (!business) {
    throw createError('business not found', 'BUSINESS_NOT_FOUND', 404);
  }

  const usersResult = await db.query(
    `SELECT
       u.id,
       u.email,
       u.is_active,
       u.platform_role,
       m.role AS business_role,
       u.created_at
     FROM memberships m
     INNER JOIN users u ON u.id = m.user_id
     WHERE m.business_id = $1
     ORDER BY u.created_at DESC`,
    [businessId]
  );

  const settingsResult = await db.query(
    `SELECT
       business_id,
       welcome_message,
       pricing_message,
       lead_capture_message,
       fallback_message,
       ai_enabled,
       human_handoff,
       created_at,
       updated_at
     FROM business_settings
     WHERE business_id = $1
     LIMIT 1`,
    [businessId]
  );

  const flowResult = await db.query(
    `SELECT id, business_id, nodes, created_at, updated_at
     FROM bot_flows
     WHERE business_id = $1
     LIMIT 1`,
    [businessId]
  );

  const whatsappResult = await db.query(
    `SELECT
       id,
       phone_number_id,
       phone_number,
       created_at
     FROM whatsapp_accounts
     WHERE business_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [businessId]
  );

  return {
    business,
    users: usersResult.rows,
    bot_settings: settingsResult.rows[0] || null,
    bot_flow: flowResult.rows[0] || null,
    whatsapp_account: whatsappResult.rows[0] || null
  };
}

async function updateBusinessById(businessId, { name, email, phone_number: phoneNumber }) {
  if (!businessId) {
    throw createError('businessId is required', 'BUSINESS_ID_REQUIRED', 400);
  }

  const normalizedName = typeof name === 'string' ? name.trim() : null;
  const normalizedEmail = typeof email === 'string' ? normalizeEmail(email) : null;
  const normalizedPhone = typeof phoneNumber === 'string' ? phoneNumber.trim() : null;

  if (normalizedName === '') {
    throw createError('name cannot be empty', 'INVALID_NAME', 400);
  }

  if (normalizedEmail === '') {
    throw createError('email cannot be empty', 'INVALID_EMAIL', 400);
  }

  if (normalizedEmail && !isValidEmail(normalizedEmail)) {
    throw createError('email inválido', 'INVALID_EMAIL', 400);
  }

  const result = await db.query(
    `UPDATE businesses
     SET
       name = COALESCE($2, name),
       email = COALESCE($3, email),
       phone_number = COALESCE($4, phone_number)
     WHERE id = $1
     RETURNING id, name, email, phone_number, is_active, created_at`,
    [businessId, normalizedName, normalizedEmail, normalizedPhone]
  );

  if (result.rows.length === 0) {
    throw createError('business not found', 'BUSINESS_NOT_FOUND', 404);
  }

  return result.rows[0];
}

async function getPlatformStats() {
  const totalsResult = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE is_active = true)::int AS active_businesses,
       COUNT(*) FILTER (WHERE is_active = false)::int AS inactive_businesses
     FROM businesses`
  );

  const conversationsResult = await db.query(
    `SELECT
       COUNT(*) FILTER (
         WHERE c.created_at >= date_trunc('day', now())
       )::int AS conversations_today,
       COUNT(*) FILTER (
         WHERE c.created_at >= date_trunc('week', now())
       )::int AS conversations_this_week
     FROM conversations c`
  );

  const leadsResult = await db.query(
    `SELECT COUNT(*)::int AS leads_this_week
     FROM leads
     WHERE created_at >= date_trunc('week', now())`
  );

  const inactiveResult = await db.query(
    `SELECT COUNT(*)::int AS businesses_without_activity_last_7_days
     FROM businesses b
     WHERE NOT EXISTS (
       SELECT 1
       FROM whatsapp_accounts w
       INNER JOIN conversations c ON c.whatsapp_account_id = w.id
       WHERE w.business_id = b.id
         AND COALESCE(c.last_message_at, c.created_at) >= now() - interval '7 days'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM leads l
       WHERE l.business_id = b.id
         AND COALESCE(l.last_interaction_at, l.updated_at, l.created_at) >= now() - interval '7 days'
     )`
  );

  return {
    active_businesses: totalsResult.rows[0].active_businesses,
    inactive_businesses: totalsResult.rows[0].inactive_businesses,
    conversations_today: conversationsResult.rows[0].conversations_today,
    conversations_this_week: conversationsResult.rows[0].conversations_this_week,
    leads_this_week: leadsResult.rows[0].leads_this_week,
    businesses_without_activity_last_7_days: inactiveResult.rows[0].businesses_without_activity_last_7_days
  };
}

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
  listBusinesses,
  createBusinessWithOwner,
  updateBusinessStatus,
  getBusinessById,
  updateBusinessById,
  getPlatformStats,
  createUserForBusiness,
  updateUserStatusForBusiness
};
