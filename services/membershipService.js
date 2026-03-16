const db = require('../db');

async function getMembershipByUser(userId) {
  if (!userId) return null;

  const q = `
    SELECT id, user_id, business_id, role, created_at
    FROM memberships
    WHERE user_id = $1
    LIMIT 1`;

  const result = await db.query(q, [userId]);
  return result.rows[0] || null;
}

async function getMembershipsByUser(userId) {
  if (!userId) return [];

  const q = `
    SELECT id, user_id, business_id, role, created_at
    FROM memberships
    WHERE user_id = $1
    ORDER BY created_at ASC`;

  const result = await db.query(q, [userId]);
  return result.rows;
}

async function createMembership(userId, businessId, role = 'OWNER') {
  const q = `
    INSERT INTO memberships (user_id, business_id, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, business_id) DO NOTHING
    RETURNING id, user_id, business_id, role, created_at`;

  const result = await db.query(q, [userId, businessId, role]);
  return result.rows[0] || null;
}

module.exports = { getMembershipByUser, getMembershipsByUser, createMembership };
