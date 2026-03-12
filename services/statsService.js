const db = require('../db');

async function getBusinessStats(businessId) {
  const q = `
    SELECT
      (
        SELECT COUNT(*)::int
        FROM leads l
        WHERE l.business_id = $1
          AND l.created_at >= date_trunc('day', now())
          AND l.created_at < date_trunc('day', now()) + interval '1 day'
      ) AS leads_today,
      (
        SELECT COUNT(*)::int
        FROM messages m
        INNER JOIN conversations c ON c.id = m.conversation_id
        INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
        WHERE wa.business_id = $1
          AND m.created_at >= date_trunc('day', now())
          AND m.created_at < date_trunc('day', now()) + interval '1 day'
      ) AS messages_today,
      (
        SELECT COUNT(*)::int
        FROM conversations c
        INNER JOIN whatsapp_accounts wa ON wa.id = c.whatsapp_account_id
        WHERE wa.business_id = $1
          AND c.created_at >= date_trunc('day', now())
          AND c.created_at < date_trunc('day', now()) + interval '1 day'
      ) AS conversations_today`;

  const result = await db.query(q, [businessId]);
  return result.rows[0] || {
    leads_today: 0,
    messages_today: 0,
    conversations_today: 0
  };
}

module.exports = { getBusinessStats };
