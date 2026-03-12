const db = require('../db');

async function resolveConversation(whatsappAccountId, userPhone) {
  if (!whatsappAccountId || !userPhone) {
    throw new Error('missing_conversation_keys');
  }

  const findQ = `
    SELECT id, whatsapp_account_id, user_phone, status, last_message_at, created_at
    FROM conversations
    WHERE whatsapp_account_id = $1
      AND user_phone = $2
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1`;

  const existing = await db.query(findQ, [whatsappAccountId, userPhone]);
  if (existing.rows.length) {
    const conversation = existing.rows[0];
    await db.query(
      `UPDATE conversations SET last_message_at = now() WHERE id = $1`,
      [conversation.id]
    );
    return conversation;
  }

  const createQ = `
    INSERT INTO conversations (
      whatsapp_account_id,
      user_phone,
      status,
      last_message_at
    )
    VALUES ($1, $2, 'active', now())
    RETURNING id, whatsapp_account_id, user_phone, status, last_message_at, created_at`;

  const created = await db.query(createQ, [whatsappAccountId, userPhone]);
  return created.rows[0];
}

async function listConversationMessagesByBusiness(conversationId, businessId) {
  const q = `
    SELECT
      m.id,
      m.direction,
      m.body AS message_text,
      m.status,
      m.created_at
    FROM messages m
    INNER JOIN conversations c ON c.id = m.conversation_id
    INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
    WHERE c.id = $1
      AND wa.business_id = $2
    ORDER BY m.created_at ASC`;

  const result = await db.query(q, [conversationId, businessId]);
  return result.rows;
}

async function listBusinessConversations(businessId, limit = 50, offset = 0) {
  const q = `
    SELECT
      c.id,
      c.user_phone,
      c.status,
      c.last_message_at,
      c.created_at
    FROM conversations c
    INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
    WHERE wa.business_id = $1
    ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
    LIMIT $2
    OFFSET $3`;

  const result = await db.query(q, [businessId, limit, offset]);
  return result.rows;
}

module.exports = {
  resolveConversation,
  listConversationMessagesByBusiness,
  listBusinessConversations
};
