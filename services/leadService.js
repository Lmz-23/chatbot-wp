const db = require('../db');
const { normalizePhone } = require('../utils/phone');

const ALLOWED_LEAD_STATUSES = new Set(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']);

function parseLeadNotes(notes) {
  if (!notes) return {};

  if (typeof notes === 'object' && !Array.isArray(notes)) {
    return notes;
  }

  if (typeof notes !== 'string') return {};

  try {
    const parsed = JSON.parse(notes);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function buildLeadNotes(existingNotes, incomingData = {}) {
  const existing = parseLeadNotes(existingNotes);
  const normalizedIncoming = Object.fromEntries(
    Object.entries(incomingData).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
  );

  const clientName = typeof normalizedIncoming.client_name === 'string' ? normalizedIncoming.client_name.trim() : '';
  const businessName = typeof normalizedIncoming.business_name === 'string' ? normalizedIncoming.business_name.trim() : '';

  if (clientName && businessName && clientName.toLowerCase() === businessName.toLowerCase()) {
    normalizedIncoming.client_name = null;
  }

  const merged = {
    ...existing,
    ...Object.fromEntries(
      Object.entries(normalizedIncoming).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    )
  };

  return Object.keys(merged).length ? JSON.stringify(merged) : null;
}

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
      notes,
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
async function createLead(businessId, phone, status = 'NEW', name = null, notes = null) {
  const normalizedPhone = normalizePhone(phone);
  if (!businessId || !normalizedPhone) {
    throw new Error('missing_lead_keys');
  }

  const normalizedStatus = String(status || 'NEW').toUpperCase();
  if (!ALLOWED_LEAD_STATUSES.has(normalizedStatus)) {
    throw new Error('invalid_lead_status');
  }

  const q = `
    INSERT INTO leads (business_id, phone, name, notes, status, last_interaction_at)
    VALUES ($1, $2, $3, $4, $5, now())
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
      notes,
      status,
      created_at,
      updated_at,
      last_interaction_at`;

  const result = await db.query(q, [businessId, normalizedPhone, name, notes, normalizedStatus]);
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
      notes,
      status,
      created_at,
      updated_at,
      last_interaction_at`;

  const result = await db.query(q, [businessId, normalizedPhone]);
  return result.rows[0] || null;
}

// Keeps CLOSED leads closed; only refreshes interaction timestamps.
/**
 * Mantiene leads cerrados como cerrados cuando el cliente vuelve a escribir.
 * @param {string} businessId - Id del negocio.
 * @param {string} phone - Telefono del cliente.
 * @returns {Promise<object|null>} Lead actualizado o null si no existe.
 */
async function reopenLeadOnIncomingMessage(businessId, phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!businessId || !normalizedPhone) return null;

  // Incoming customer activity should not reactivate a CLOSED lead automatically.
  // Keep status as-is and only bump interaction timestamps.
  const q = `
    UPDATE leads
    SET updated_at = now(),
        last_interaction_at = now()
    WHERE business_id = $1
      AND phone = $2
    RETURNING
      id,
      business_id,
      phone,
      name,
      notes,
      status,
      created_at,
      updated_at,
      last_interaction_at`;

  const result = await db.query(q, [businessId, normalizedPhone]);
  return result.rows[0] || null;
}

// Moves NEW leads to CONTACTED when an agent sends a message.
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
      notes,
      status,
      created_at,
      updated_at,
      last_interaction_at`;

  const result = await db.query(q, [businessId, normalizedPhone]);
  return result.rows[0] || null;
}

async function closeLeadByBusinessAndPhone(businessId, phone) {
  const normalizedPhone = normalizePhone(phone);
  if (!businessId || !normalizedPhone) return null;

  const q = `
    UPDATE leads
    SET status = 'CLOSED',
        updated_at = now(),
        last_interaction_at = now()
    WHERE business_id = $1
      AND phone = $2
    RETURNING
      id,
      business_id,
      phone,
      name,
      notes,
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
      notes,
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
async function updateLeadByIdAndBusiness(leadId, businessId, { name, status, notes }) {
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

  if (notes !== undefined) {
    params.push(notes === null ? null : String(notes));
    updates.push(`notes = $${params.length}`);
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
      notes,
      status,
      created_at,
      updated_at,
      last_interaction_at`;

  const result = await db.query(q, params);
  return result.rows[0] || null;
}

async function upsertLeadFromConversationData(businessId, phone, data = {}) {
  const normalizedPhone = normalizePhone(phone);
  if (!businessId || !normalizedPhone) return null;

  const clientName = typeof data.client_name === 'string' ? data.client_name.trim() : '';
  const businessName = typeof data.business_name === 'string' ? data.business_name.trim() : '';
  const contact = typeof data.contact === 'string' ? data.contact.trim() : '';
  const interest = typeof data.interest === 'string' ? data.interest.trim() : '';

  const sanitizedClientName = clientName && businessName && clientName.toLowerCase() === businessName.toLowerCase()
    ? ''
    : clientName;

  const existingLead = await findLeadByBusinessAndPhone(businessId, normalizedPhone);
  const nextName = existingLead && existingLead.name ? existingLead.name : (sanitizedClientName || null);
  const nextNotes = buildLeadNotes(existingLead ? existingLead.notes : null, {
    client_name: sanitizedClientName || null,
    business_name: businessName || null,
    contact: contact || null,
    interest: interest || null
  });

  const q = `
    INSERT INTO leads (business_id, phone, name, notes, status, last_interaction_at)
    VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, now())
    ON CONFLICT (business_id, phone)
    DO UPDATE SET
      name = CASE
        WHEN COALESCE(leads.name, '') = '' AND EXCLUDED.name IS NOT NULL THEN EXCLUDED.name
        ELSE leads.name
      END,
      notes = COALESCE(EXCLUDED.notes, leads.notes),
      updated_at = now(),
      last_interaction_at = now()
    RETURNING
      id,
      business_id,
      phone,
      name,
      notes,
      status,
      created_at,
      updated_at,
      last_interaction_at`;

  const result = await db.query(q, [businessId, normalizedPhone, nextName || null, nextNotes, 'NEW']);
  return result.rows[0] || null;
}

/**
 * Retorna todos los leads de un negocio con estado de conversación asociada.
 * @param {string} businessId - Id del negocio.
 * @returns {Promise<object[]>} Array de leads con conversation_status incluido.
 */
async function getLeadsWithConversationStatus(businessId) {
  const q = `
    SELECT
      l.id,
      l.business_id,
      l.phone,
      l.name,
      l.notes,
      l.status,
      l.created_at,
      l.updated_at,
      l.last_interaction_at,
      conv.conv_status AS conversation_status
    FROM leads l
    LEFT JOIN LATERAL (
      SELECT c.status as conv_status
      FROM conversations c
      INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
      WHERE wa.business_id = l.business_id
        AND regexp_replace(c.user_phone, '\\D', '', 'g') = 
            regexp_replace(l.phone, '\\D', '', 'g')
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT 1
    ) conv ON true
    WHERE l.business_id = $1
    ORDER BY l.last_interaction_at DESC, l.created_at DESC`;

  const result = await db.query(q, [businessId]);
  return result.rows;
}

/**
 * Retorna un lead específico con estado de conversación asociada.
 * @param {string} leadId - Id del lead.
 * @param {string} businessId - Id del negocio (para scope).
 * @returns {Promise<object|null>} Lead con conversation_status o null.
 */
async function getLeadWithConversationStatus(leadId, businessId) {
  const q = `
    SELECT
      l.id,
      l.business_id,
      l.phone,
      l.name,
      l.notes,
      l.status,
      l.created_at,
      l.updated_at,
      l.last_interaction_at,
      conv.conv_status AS conversation_status
    FROM leads l
    LEFT JOIN LATERAL (
      SELECT c.status as conv_status
      FROM conversations c
      INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
      WHERE wa.business_id = l.business_id
        AND regexp_replace(c.user_phone, '\\D', '', 'g') = 
            regexp_replace(l.phone, '\\D', '', 'g')
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT 1
    ) conv ON true
    WHERE l.id = $1
      AND l.business_id = $2`;

  const result = await db.query(q, [leadId, businessId]);
  return result.rows[0] || null;
}

/**
 * Alias para updateLeadByIdAndBusiness con soporte a notes directos.
 * @param {string} leadId - Id del lead.
 * @param {string} businessId - Id del negocio.
 * @param {{ name?: string|null, status?: string }} updates - Campos a actualizar.
 * @returns {Promise<object|null>} Lead actualizado.
 */
async function updateLeadById(leadId, businessId, updates = {}) {
  return updateLeadByIdAndBusiness(leadId, businessId, updates);
}

module.exports = {
  ALLOWED_LEAD_STATUSES,
  createLead,
  findLeadByBusinessAndPhone,
  upsertLeadFromIncomingMessage,
  reopenLeadOnIncomingMessage,
  promoteLeadOnAgentMessage,
  closeLeadByBusinessAndPhone,
  upsertLeadFromConversationData,
  listLeadsByBusinessId,
  updateLeadByIdAndBusiness,
  getLeadsWithConversationStatus,
  getLeadWithConversationStatus,
  updateLeadById
};
