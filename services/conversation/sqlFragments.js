const TARGET_THREAD_BY_CONVERSATION_AND_BUSINESS_CTE = `
WITH target AS (
  SELECT
    c.whatsapp_account_id,
    regexp_replace(c.user_phone, '\\D', '', 'g') AS phone_norm
  FROM conversations c
  INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
  WHERE c.id = $1
    AND wa.business_id = $2
  LIMIT 1
)`;

const TARGET_THREAD_BY_CONVERSATION_CTE = `
WITH target AS (
  SELECT
    whatsapp_account_id,
    regexp_replace(user_phone, '\\D', '', 'g') AS phone_norm
  FROM conversations
  WHERE id = $1
  LIMIT 1
)`;

function threadPhoneMatchSql(conversationAlias) {
  return `regexp_replace(${conversationAlias}.user_phone, '\\D', '', 'g') = t.phone_norm`;
}

module.exports = {
  TARGET_THREAD_BY_CONVERSATION_AND_BUSINESS_CTE,
  TARGET_THREAD_BY_CONVERSATION_CTE,
  threadPhoneMatchSql
};
