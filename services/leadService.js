const db = require('../db');
const { normalizePhone } = require('../utils/phone');

const ALLOWED_LEAD_STATUSES = new Set(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']);

async function findLeadByBusinessAndPhone(businessId, phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!businessId || !normalizedPhone) return null;

  const q = `
    SELECT
      id,
      business_id,
      phone,
      name,
      status,
      created_at,
      updated_at,
      last_interaction_at
    FROM leads
    WHERE business_id = $1
      AND phone = $2
    LIMIT 1`;

  const result = await db.query(q, [businessId, normalizedPhone]);
  return result.rows[0] || null;
}

async function createLead(businessId, phone, status = 'NEW', name = null) {
  const normalizedPhone = normalizePhone(phone);
  if (!businessId || !normalizedPhone) {
    throw new Error('missing_lead_keys');
  }

  const normalizedStatus = String(status || 'NEW').toUpperCase();
  if (!ALLOWED_LEAD_STATUSES.has(normalizedStatus)) {
    throw new Error('invalid_lead_status');
  }

  const q = `
    INSERT INTO leads (business_id, phone, name, status, last_interaction_at)
    VALUES ($1, $2, $3, $4, now())
    ON CONFLICT (business_id, phone)
    DO UPDATE SET
      name = COALESCE(EXCLUDED.name, leads.name),
      status = leads.status,
      updated_at = now(),
      last_interaction_at = now()
    RETURNING
      id,
      business_id,
      phone,
      name,
      status,
      created_at,
      updated_at,
      last_interaction_at`;

  const result = await db.query(q, [businessId, normalizedPhone, name, normalizedStatus]);
  return result.rows[0] || null;
}

async function upsertLeadFromIncomingMessage(businessId, phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!businessId || !normalizedPhone) return null;

  const q = `
    INSERT INTO leads (business_id, phone, status, last_interaction_at)
    VALUES ($1, $2, 'NEW', now())
    ON CONFLICT (business_id, phone)
    DO UPDATE SET
      last_interaction_at = now(),
      updated_at = now()
    RETURNING
      id,
      business_id,
      phone,
      name,
      status,
      created_at,
      updated_at,
      last_interaction_at`;

  const result = await db.query(q, [businessId, normalizedPhone]);
  return result.rows[0] || null;
}

async function reopenLeadOnIncomingMessage(businessId, phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!businessId || !normalizedPhone) return null;

  const q = `
    UPDATE leads
    SET status = 'CONTACTED',
        updated_at = now(),
        last_interaction_at = now()
    WHERE business_id = $1
      AND phone = $2
      AND status = 'CLOSED'
    RETURNING
      id,
      business_id,
      phone,
      name,
      status,
      created_at,
      updated_at,
      last_interaction_at`;

  const result = await db.query(q, [businessId, normalizedPhone]);
  return result.rows[0] || null;
}

async function promoteLeadOnAgentMessage(businessId, phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!businessId || !normalizedPhone) return null;

  const q = `
    INSERT INTO leads (business_id, phone, status, last_interaction_at)
    VALUES ($1, $2, 'CONTACTED', now())
    ON CONFLICT (business_id, phone)
    DO UPDATE SET
      status = CASE
        WHEN leads.status = 'NEW' THEN 'CONTACTED'
        ELSE leads.status
      END,
      updated_at = now(),
      last_interaction_at = now()
    RETURNING
      id,
      business_id,
      phone,
      name,
      status,
      created_at,
      updated_at,
      last_interaction_at`;

  const result = await db.query(q, [businessId, normalizedPhone]);
  return result.rows[0] || null;
}

async function listLeadsByBusinessId(businessId) {
  const q = `
    SELECT
      id,
      phone,
      name,
      status,
      created_at,
      updated_at,
      last_interaction_at
    FROM leads
    WHERE business_id = $1
    ORDER BY last_interaction_at DESC, created_at DESC`;

  const result = await db.query(q, [businessId]);
  return result.rows;
}

async function updateLeadByIdAndBusiness(leadId, businessId, { name, status }) {
  const updates = [];
  const params = [leadId, businessId];

  if (name !== undefined) {
    params.push(name === null ? null : String(name));
    updates.push(`name = $${params.length}`);
  }

  if (status !== undefined) {
    const normalizedStatus = String(status).toUpperCase();
    if (!ALLOWED_LEAD_STATUSES.has(normalizedStatus)) {
      throw new Error('invalid_lead_status');
    }
    params.push(normalizedStatus);
    updates.push(`status = $${params.length}`);
  }

  if (updates.length === 0) {
    return null;
  }

  updates.push('updated_at = now()');

  const q = `
    UPDATE leads
    SET ${updates.join(', ')}
    WHERE id = $1
      AND business_id = $2
    RETURNING
      id,
      business_id,
      phone,
      name,
      status,
      created_at,
      updated_at,
      last_interaction_at`;

  const result = await db.query(q, params);
  return result.rows[0] || null;
}

module.exports = {
  ALLOWED_LEAD_STATUSES,
  createLead,
  findLeadByBusinessAndPhone,
  upsertLeadFromIncomingMessage,
  reopenLeadOnIncomingMessage,
  promoteLeadOnAgentMessage,
  listLeadsByBusinessId,
  updateLeadByIdAndBusiness
};
