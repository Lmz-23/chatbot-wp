require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('../db');

const EMAIL = 'admin@test.com';
const PASSWORD = 'Admin1234!';
const ROLE = 'PLATFORM_ADMIN';

async function seedAdmin() {
  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [EMAIL]);
    if (existing.rows.length > 0) {
      console.log('User already exists:', EMAIL);
      await db.pool.end();
      return;
    }

    const passwordHash = await bcrypt.hash(PASSWORD, 10);

    const result = await db.query(
      `INSERT INTO users (email, password_hash, platform_role)
       VALUES ($1, $2, $3)
       RETURNING id, email, platform_role, created_at`,
      [EMAIL, passwordHash, ROLE]
    );

    console.log('Admin created successfully:');
    console.log('  id:   ', result.rows[0].id);
    console.log('  email:', result.rows[0].email);
    console.log('  role: ', result.rows[0].platform_role);
    console.log('  pass: ', PASSWORD);
  } catch (err) {
    console.error('seed_failed:', err.message || err);
  } finally {
    await db.pool.end();
  }
}

seedAdmin();
