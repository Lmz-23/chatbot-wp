const db = require('../db');

async function createLead(businessId, conversationId, phone, interest) {
  if (!businessId || !conversationId) {
    throw new Error('missing_lead_keys');
  }

  const q = `
    INSERT INTO leads (business_id, conversation_id, phone, interest)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (conversation_id) WHERE conversation_id IS NOT NULL DO NOTHING
    RETURNING *`;

  const result = await db.query(q, [businessId, conversationId, phone || null, interest || null]);
  return result.rows[0] || null;
}

async function getLeadByConversation(conversationId) {
  if (!conversationId) return null;

  const q = `
    SELECT * FROM leads
    WHERE conversation_id = $1
    LIMIT 1`;

  const result = await db.query(q, [conversationId]);
  return result.rows[0] || null;
}

async function listLeadsByBusinessId(businessId) {
  const q = `
    SELECT
      id,
      phone,
      interest,
      status,
      created_at
    FROM leads
    WHERE business_id = $1
    ORDER BY created_at DESC`;

  const result = await db.query(q, [businessId]);
  return result.rows;
}

async function updateLeadStatusByBusiness(leadId, businessId, status) {
  const q = `
    UPDATE leads
    SET status = $3,
        updated_at = now()
    WHERE id = $1
      AND business_id = $2
    RETURNING
      id,
      business_id,
      phone,
      interest,
      status,
      created_at,
      updated_at`;

  const result = await db.query(q, [leadId, businessId, status]);
  return result.rows[0] || null;
}

module.exports = {
  createLead,
  getLeadByConversation,
  listLeadsByBusinessId,
  updateLeadStatusByBusiness
};
