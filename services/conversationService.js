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

module.exports = { resolveConversation };
