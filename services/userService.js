const db = require('../db');

// Fetches user auth profile by email including membership context.
async function findByEmail(email) {
  if (!email) return null;

  const q = `
    SELECT u.id, u.email, u.password_hash, u.is_active, u.platform_role,
           m.business_id, m.role AS membership_role
    FROM users u
    LEFT JOIN memberships m ON m.user_id = u.id
    WHERE u.email = $1
    LIMIT 1`;

  const result = await db.query(q, [email]);
  return result.rows[0] || null;
}

// Fetches user profile by id including membership context.
async function findById(userId) {
  if (!userId) return null;

  const q = `
    SELECT u.id, u.email, u.is_active, u.platform_role,
           m.business_id, m.role AS membership_role
    FROM users u
    LEFT JOIN memberships m ON m.user_id = u.id
    WHERE u.id = $1
    LIMIT 1`;

  const result = await db.query(q, [userId]);
  return result.rows[0] || null;
}

// Creates a platform user record.
async function createUser(email, passwordHash, platformRole = 'USER') {
  const q = `
    INSERT INTO users (email, password_hash, is_active, platform_role)
    VALUES ($1, $2, true, $3)
    RETURNING id, email, is_active, platform_role, created_at`;

  const result = await db.query(q, [email, passwordHash, platformRole]);
  return result.rows[0];
}

module.exports = { findByEmail, findById, createUser };
