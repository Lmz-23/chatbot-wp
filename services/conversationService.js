const db = require('../db');
const { normalizePhone } = require('../utils/phone');

async function resolveConversation(whatsappAccountId, userPhone) {
  const normalizedPhone = normalizePhone(userPhone);

  if (!whatsappAccountId || !normalizedPhone) {
    throw new Error('missing_conversation_keys');
  }

  const findLatestQ = `
    SELECT id, whatsapp_account_id, user_phone, status, last_message_at, created_at
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
        status: 'bot'
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
    RETURNING id, whatsapp_account_id, user_phone, status, last_message_at, created_at`;

  const created = await db.query(createQ, [whatsappAccountId, normalizedPhone]);
  return created.rows[0];
}

async function listConversationMessagesByBusiness(conversationId, businessId) {
  const q = `
    WITH target AS (
      SELECT
        c.whatsapp_account_id,
        regexp_replace(c.user_phone, '\\D', '', 'g') AS phone_norm
      FROM conversations c
      INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
      WHERE c.id = $1
        AND wa.business_id = $2
      LIMIT 1
    )
    SELECT
      m.id,
      m.direction,
      m.body AS message_text,
      m.status,
      m.from_number,
      m.to_number,
      CASE
        WHEN m.direction = 'inbound' THEN 'customer'
        WHEN m.direction = 'incoming' THEN 'customer'
        WHEN m.direction = 'outgoing' THEN 'agent'
        WHEN m.direction = 'outbound' AND m.status IN ('agent_sent', 'agent_failed') THEN 'agent'
        WHEN m.direction = 'outbound' THEN 'bot'
        WHEN m.from_number = c.user_phone THEN 'customer'
        WHEN m.to_number = c.user_phone THEN 'bot'
        ELSE 'unknown'
      END AS sender_type,
      m.created_at
    FROM messages m
    INNER JOIN conversations c ON c.id = m.conversation_id
    INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
    INNER JOIN target t
      ON t.whatsapp_account_id = c.whatsapp_account_id
      AND regexp_replace(c.user_phone, '\\D', '', 'g') = t.phone_norm
    WHERE wa.business_id = $2
    ORDER BY m.created_at ASC`;

  const result = await db.query(q, [conversationId, businessId]);
  return result.rows;
}

async function listBusinessConversations(businessId, limit = 50, offset = 0) {
  const q = `
    WITH ranked_conversations AS (
      SELECT
        c.*,
        ROW_NUMBER() OVER (
          PARTITION BY regexp_replace(c.user_phone, '\\D', '', 'g'), c.whatsapp_account_id
          ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
        ) AS rn
      FROM conversations c
      INNER JOIN whatsapp_accounts wa_inner ON wa_inner.id = c.whatsapp_account_id
      WHERE wa_inner.business_id = $1
    )
    SELECT
      c.id,
      c.user_phone,
      l.id AS lead_id,
      l.name AS lead_name,
      l.status AS lead_status,
      c.status,
      c.last_message_at,
      c.created_at,
      lm.body AS last_message_text,
      lm.direction AS last_message_direction
    FROM ranked_conversations c
    INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
    LEFT JOIN leads l
      ON l.business_id = wa.business_id
      AND regexp_replace(l.phone, '\\D', '', 'g') = regexp_replace(c.user_phone, '\\D', '', 'g')
    LEFT JOIN LATERAL (
      SELECT m.body, m.direction
      FROM messages m
      INNER JOIN conversations c2 ON c2.id = m.conversation_id
      WHERE c2.whatsapp_account_id = c.whatsapp_account_id
        AND regexp_replace(c2.user_phone, '\\D', '', 'g') = regexp_replace(c.user_phone, '\\D', '', 'g')
      ORDER BY m.created_at DESC
      LIMIT 1
    ) lm ON true
    WHERE wa.business_id = $1
      AND c.rn = 1
    ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
    LIMIT $2
    OFFSET $3`;

  const result = await db.query(q, [businessId, limit, offset]);
  return result.rows;
}

async function getConversationWithBusiness(conversationId, businessId) {
  const q = `
    SELECT
      c.id,
      c.whatsapp_account_id,
      c.user_phone,
      c.status,
      wa.id AS whatsapp_account_id,
      wa.phone_number_id,
      wa.phone_number,
      wa.token,
      b.id AS business_id,
      b.name AS business_name
    FROM conversations c
    INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
    INNER JOIN businesses b ON b.id = wa.business_id
    WHERE c.id = $1
      AND b.id = $2
    LIMIT 1`;

  const result = await db.query(q, [conversationId, businessId]);
  return result.rows[0];
}

async function updateConversationStatusByBusiness(conversationId, businessId, status) {
  const q = `
    WITH target AS (
      SELECT
        c.whatsapp_account_id,
        regexp_replace(c.user_phone, '\\D', '', 'g') AS phone_norm
      FROM conversations c
      INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
      WHERE c.id = $1
        AND wa.business_id = $2
      LIMIT 1
    ), updated AS (
      UPDATE conversations c
      SET status = $3
      FROM target t
      WHERE c.whatsapp_account_id = t.whatsapp_account_id
        AND regexp_replace(c.user_phone, '\\D', '', 'g') = t.phone_norm
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
    WITH target AS (
      SELECT
        whatsapp_account_id,
        regexp_replace(user_phone, '\\D', '', 'g') AS phone_norm
      FROM conversations
      WHERE id = $1
      LIMIT 1
    )
    UPDATE conversations c
    SET status = 'active'
    FROM target t
    WHERE c.whatsapp_account_id = t.whatsapp_account_id
      AND regexp_replace(c.user_phone, '\\D', '', 'g') = t.phone_norm`;

  await db.query(q, [conversationId]);
}

module.exports = {
  resolveConversation,
  listConversationMessagesByBusiness,
  listBusinessConversations,
  getConversationWithBusiness,
  updateConversationStatusByBusiness,
  saveMessage,
  markConversationActive
};
