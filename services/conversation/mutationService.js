const db = require('../../db');
const { normalizePhone } = require('../../utils/phone');
const {
  TARGET_THREAD_BY_CONVERSATION_AND_BUSINESS_CTE,
  TARGET_THREAD_BY_CONVERSATION_CTE,
  threadPhoneMatchSql
} = require('./sqlFragments');

async function resolveConversation(whatsappAccountId, userPhone) {
  const normalizedPhone = normalizePhone(userPhone);

  if (!whatsappAccountId || !normalizedPhone) {
    throw new Error('missing_conversation_keys');
  }

  const findLatestQ = `
    SELECT id, whatsapp_account_id, user_phone, status, current_node, last_message_at, created_at
    FROM conversations
    WHERE whatsapp_account_id = $1
      AND regexp_replace(user_phone, '\\D', '', 'g') = $2
    ORDER BY last_message_at DESC NULLS LAST, created_at DESC
    LIMIT 1`;

  const latest = await db.query(findLatestQ, [whatsappAccountId, normalizedPhone]);
  if (latest.rows.length) {
    const conversation = latest.rows[0];

    if (conversation.status === 'closed') {
      await db.query(
        `UPDATE conversations SET status = 'bot' WHERE id = $1`,
        [conversation.id]
      );
      return {
        ...conversation,
        status: 'bot',
        current_node: conversation.current_node || 'start'
      };
    }

    return conversation;
  }

  const createQ = `
    INSERT INTO conversations (
      whatsapp_account_id,
      user_phone,
      status,
      last_message_at
    )
    VALUES ($1, $2, 'bot', now())
    RETURNING id, whatsapp_account_id, user_phone, status, current_node, last_message_at, created_at`;

  const created = await db.query(createQ, [whatsappAccountId, normalizedPhone]);
  return created.rows[0];
}

async function updateConversationCurrentNodeByBusiness(conversationId, businessId, currentNode) {
  const q = `
    ${TARGET_THREAD_BY_CONVERSATION_AND_BUSINESS_CTE}
    UPDATE conversations c
    SET current_node = $3
    FROM target t
    WHERE c.whatsapp_account_id = t.whatsapp_account_id
      AND ${threadPhoneMatchSql('c')}
    RETURNING c.id, c.user_phone, c.status, c.current_node, c.last_message_at, c.created_at`;

  const result = await db.query(q, [conversationId, businessId, currentNode || 'start']);
  return result.rows[0] || null;
}

async function updateConversationStatusByBusiness(conversationId, businessId, status) {
  const q = `
    ${TARGET_THREAD_BY_CONVERSATION_AND_BUSINESS_CTE}, updated AS (
      UPDATE conversations c
      SET status = $3
      FROM target t
      WHERE c.whatsapp_account_id = t.whatsapp_account_id
        AND ${threadPhoneMatchSql('c')}
      RETURNING c.id, c.user_phone, c.status, c.last_message_at, c.created_at
    )
    SELECT *
    FROM updated
    ORDER BY last_message_at DESC NULLS LAST, created_at DESC
    LIMIT 1`;

  const result = await db.query(q, [conversationId, businessId, status]);
  return result.rows[0] || null;
}

async function saveMessage(conversationId, direction, body, status = 'sent') {
  const q = `
    INSERT INTO messages (
      conversation_id,
      direction,
      body,
      status
    )
    VALUES ($1, $2, $3, $4)
    RETURNING id, direction, body AS message_text, status, created_at`;

  const result = await db.query(q, [conversationId, direction, body, status]);
  return result.rows[0];
}

async function markConversationActive(conversationId) {
  const q = `
    ${TARGET_THREAD_BY_CONVERSATION_CTE}
    UPDATE conversations c
    SET status = 'active'
    FROM target t
    WHERE c.whatsapp_account_id = t.whatsapp_account_id
      AND ${threadPhoneMatchSql('c')}`;

  await db.query(q, [conversationId]);
}

module.exports = {
  resolveConversation,
  updateConversationCurrentNodeByBusiness,
  updateConversationStatusByBusiness,
  saveMessage,
  markConversationActive
};
