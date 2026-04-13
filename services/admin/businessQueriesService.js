const db = require('../../db');

function createError(message, code, status = 400) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

async function listBusinesses() {
  const q = `
    SELECT
      b.id,
      b.name,
      b.phone_number,
      b.is_active,
      b.created_at,
      COUNT(DISTINCT m.user_id)::int AS users_count,
      COUNT(DISTINCT c.id)::int AS conversations_count,
      MAX(COALESCE(c.last_message_at, c.created_at)) AS last_activity
    FROM businesses b
    LEFT JOIN memberships m ON m.business_id = b.id
    LEFT JOIN whatsapp_accounts w ON w.business_id = b.id
    LEFT JOIN conversations c ON c.whatsapp_account_id = w.id
    GROUP BY b.id
    ORDER BY b.created_at DESC`;

  const result = await db.query(q);
  return result.rows;
}

async function getBusinessById(businessId) {
  const businessResult = await db.query(
    `SELECT id, name, phone_number, is_active, created_at
     FROM businesses
     WHERE id = $1
     LIMIT 1`,
    [businessId]
  );

  const business = businessResult.rows[0] || null;
  if (!business) {
    throw createError('business not found', 'BUSINESS_NOT_FOUND', 404);
  }

  const usersResult = await db.query(
    `SELECT
       u.id,
       u.email,
       u.is_active,
       u.platform_role,
       m.role AS business_role,
       u.created_at
     FROM memberships m
     INNER JOIN users u ON u.id = m.user_id
     WHERE m.business_id = $1
     ORDER BY u.created_at DESC`,
    [businessId]
  );

  const settingsResult = await db.query(
    `SELECT
       business_id,
       welcome_message,
       pricing_message,
       lead_capture_message,
       fallback_message,
       ai_enabled,
       human_handoff,
       created_at,
       updated_at
     FROM business_settings
     WHERE business_id = $1
     LIMIT 1`,
    [businessId]
  );

  const flowResult = await db.query(
    `SELECT id, business_id, nodes, created_at, updated_at
     FROM bot_flows
     WHERE business_id = $1
     LIMIT 1`,
    [businessId]
  );

  const whatsappResult = await db.query(
    `SELECT
       id,
       phone_number_id,
       phone_number,
       created_at
     FROM whatsapp_accounts
     WHERE business_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [businessId]
  );

  return {
    business,
    users: usersResult.rows,
    bot_settings: settingsResult.rows[0] || null,
    bot_flow: flowResult.rows[0] || null,
    whatsapp_account: whatsappResult.rows[0] || null
  };
}

async function getPlatformStats() {
  const totalsResult = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE is_active = true)::int AS active_businesses,
       COUNT(*) FILTER (WHERE is_active = false)::int AS inactive_businesses
     FROM businesses`
  );

  const conversationsResult = await db.query(
    `SELECT
       COUNT(*) FILTER (
         WHERE c.created_at >= date_trunc('day', now())
       )::int AS conversations_today,
       COUNT(*) FILTER (
         WHERE c.created_at >= date_trunc('week', now())
       )::int AS conversations_this_week
     FROM conversations c`
  );

  const leadsResult = await db.query(
    `SELECT COUNT(*)::int AS leads_this_week
     FROM leads
     WHERE created_at >= date_trunc('week', now())`
  );

  const inactiveResult = await db.query(
    `SELECT COUNT(*)::int AS businesses_without_activity_last_7_days
     FROM businesses b
     WHERE NOT EXISTS (
       SELECT 1
       FROM whatsapp_accounts w
       INNER JOIN conversations c ON c.whatsapp_account_id = w.id
       WHERE w.business_id = b.id
         AND COALESCE(c.last_message_at, c.created_at) >= now() - interval '7 days'
     )
     AND NOT EXISTS (
       SELECT 1
       FROM leads l
       WHERE l.business_id = b.id
         AND COALESCE(l.last_interaction_at, l.updated_at, l.created_at) >= now() - interval '7 days'
     )`
  );

  return {
    active_businesses: totalsResult.rows[0].active_businesses,
    inactive_businesses: totalsResult.rows[0].inactive_businesses,
    conversations_today: conversationsResult.rows[0].conversations_today,
    conversations_this_week: conversationsResult.rows[0].conversations_this_week,
    leads_this_week: leadsResult.rows[0].leads_this_week,
    businesses_without_activity_last_7_days: inactiveResult.rows[0].businesses_without_activity_last_7_days
  };
}

module.exports = {
  listBusinesses,
  getBusinessById,
  getPlatformStats
};
