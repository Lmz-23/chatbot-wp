const db = require('../db');

async function createLead(businessId, conversationId, phone, interest) {
  if (!businessId || !conversationId) {
    throw new Error('missing_lead_keys');
  }

  const q = `
    INSERT INTO leads (business_id, conversation_id, phone, interest)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (conversation_id) DO NOTHING
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

module.exports = { createLead, getLeadByConversation };
