const db = require('../db');
const { normalizePhone } = require('../utils/phone');

const ALLOWED_LEAD_STATUSES = new Set(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']);

// Looks up a single lead by tenant + normalized phone.
/**
 * Busca un lead por negocio y telefono normalizado.
 * @param {string} businessId - Id del negocio.
 * @param {string} phone - Telefono del cliente.
 * @returns {Promise<object|null>} Lead encontrado o null.
 */
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

// Creates (or refreshes) a lead while preserving current status on conflict.
/**
 * Crea o refresca un lead sin degradar el estado existente en conflicto.
 * @param {string} businessId - Id del negocio.
 * @param {string} phone - Telefono del cliente.
 * @param {string} [status='NEW'] - Estado objetivo.
 * @param {string|null} [name=null] - Nombre opcional del lead.
 * @returns {Promise<object|null>} Lead creado/actualizado.
 * @throws {Error} Si faltan claves o el estado es invalido.
 */
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

// Ensures an inbound customer message always has an associated lead.
/**
 * Asegura que un mensaje entrante tenga lead asociado.
 * @param {string} businessId - Id del negocio.
 * @param {string} phone - Telefono del cliente.
 * @returns {Promise<object|null>} Lead creado/actualizado o null.
 */
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

// Reopens CLOSED leads to CONTACTED when a customer returns.
/**
 * Reabre leads cerrados cuando el cliente vuelve a escribir.
 * @param {string} businessId - Id del negocio.
 * @param {string} phone - Telefono del cliente.
 * @returns {Promise<object|null>} Lead reabierto o null si no aplica.
 */
async function reopenLeadOnIncomingMessage(businessId, phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!businessId || !normalizedPhone) return null;

  // When a customer sends an inbound message to a CLOSED lead, reactivate it to CONTACTED.
  // Do NOT reopen QUALIFIED leads - they're intentionally in that state and client engagement
  // doesn't automatically demote them (avoid loop: agent promotes → customer replies → demotes again).
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

// Moves NEW/CLOSED leads to CONTACTED when an agent sends a message.
/**
 * Promueve lead a CONTACTED por mensaje de agente.
 * @param {string} businessId - Id del negocio.
 * @param {string} phone - Telefono del cliente.
 * @returns {Promise<object|null>} Lead actualizado.
 */
async function promoteLeadOnAgentMessage(businessId, phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!businessId || !normalizedPhone) return null;

  const q = `
    INSERT INTO leads (business_id, phone, status, last_interaction_at)
    VALUES ($1, $2, 'CONTACTED', now())
    ON CONFLICT (business_id, phone)
    DO UPDATE SET
      status = CASE
        WHEN leads.status IN ('NEW', 'CLOSED') THEN 'CONTACTED'
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

// Lists tenant leads ordered by most recent interaction.
/**
 * Lista leads de un negocio ordenados por ultima interaccion.
 * @param {string} businessId - Id del negocio.
 * @returns {Promise<object[]>} Coleccion de leads.
 */
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

// Partially updates lead fields with tenant scoping and status validation.
/**
 * Actualiza campos de un lead con alcance por negocio.
 * @param {string} leadId - Id del lead.
 * @param {string} businessId - Id del negocio.
 * @param {{ name?: string|null, status?: string }} param2 - Campos parciales a actualizar.
 * @returns {Promise<object|null>} Lead actualizado o null.
 * @throws {Error} Si status es invalido.
 */
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
