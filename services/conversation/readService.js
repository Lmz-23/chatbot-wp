const db = require('../../db');
const { MESSAGE_SENDER_TYPE_CASE_SQL } = require('./constants');
const {
  TARGET_THREAD_BY_CONVERSATION_AND_BUSINESS_CTE,
  threadPhoneMatchSql
} = require('./sqlFragments');

async function listConversationMessagesByBusiness(conversationId, businessId) {
  const q = `
    ${TARGET_THREAD_BY_CONVERSATION_AND_BUSINESS_CTE}
    SELECT
      m.id,
      m.direction,
      m.body AS message_text,
      m.status,
      m.from_number,
      m.to_number,
      ${MESSAGE_SENDER_TYPE_CASE_SQL} AS sender_type,
      m.created_at
    FROM messages m
    INNER JOIN conversations c ON c.id = m.conversation_id
    INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
    INNER JOIN target t
      ON t.whatsapp_account_id = c.whatsapp_account_id
      AND ${threadPhoneMatchSql('c')}
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
      lm.direction AS last_message_direction,
      lm.status AS last_message_status,
      lm.sender_type AS last_message_sender_type,
      lm.created_at AS last_message_created_at
    FROM ranked_conversations c
    INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
    LEFT JOIN leads l
      ON l.business_id = wa.business_id
      AND regexp_replace(l.phone, '\\D', '', 'g') = regexp_replace(c.user_phone, '\\D', '', 'g')
    LEFT JOIN LATERAL (
      SELECT
        m.body,
        m.direction,
        m.status,
        m.created_at,
        ${MESSAGE_SENDER_TYPE_CASE_SQL} AS sender_type
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
      c.current_node,
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

module.exports = {
  listConversationMessagesByBusiness,
  listBusinessConversations,
  getConversationWithBusiness
};
