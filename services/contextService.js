const db = require('../db');

async function getConversationContext(conversationId) {
  if (!conversationId) return [];

  const q = `
    SELECT id, message_id, from_number, to_number, body, direction, status, created_at
    FROM (
      SELECT id, message_id, from_number, to_number, body, direction, status, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    ) recent
    ORDER BY created_at ASC`;

  const { rows } = await db.query(q, [conversationId]);
  return rows;
}

module.exports = { getConversationContext };
