const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userService = require('./userService');
const db = require('../db');
const botFlowService = require('./botFlowService');
const { defaultClinicBotFlowNodes } = require('../db/models');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function buildTokenPayload({ userId, platformRole, businessId = null, businessRole = null }) {
  return {
    userId,
    platformRole,
    businessId,
    businessRole
  };
}

function generateToken(payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.verify(token, JWT_SECRET);
}

// Authenticates credentials and returns a signed JWT with tenant context.
async function login(email, password) {
  const user = await userService.findByEmail(email);
  if (!user) {
    const err = new Error('INVALID_CREDENTIALS');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  if (user.is_active === false) {
    const err = new Error('ACCOUNT_DISABLED');
    err.code = 'ACCOUNT_DISABLED';
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('INVALID_CREDENTIALS');
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const isPlatformAdmin = user.platform_role === 'PLATFORM_ADMIN';
  const hasTenantMembership = user.membership_role === 'OWNER' || user.membership_role === 'AGENT';

  if (!isPlatformAdmin && hasTenantMembership && user.business_id) {
    const businessResult = await db.query(
      `SELECT is_active
       FROM businesses
       WHERE id = $1
       LIMIT 1`,
      [user.business_id]
    );

    const business = businessResult.rows[0] || null;
    if (business && business.is_active === false) {
      const err = new Error('BUSINESS_SUSPENDED');
      err.code = 'BUSINESS_SUSPENDED';
      throw err;
    }
  }

  const payload = buildTokenPayload({
    userId: user.id,
    platformRole: user.platform_role,
    businessId: user.business_id || null,
    businessRole: user.membership_role || null
  });

  const token = generateToken(payload);
  return {
    token,
    userId: user.id,
    platformRole: payload.platformRole,
    businessId: payload.businessId,
    businessRole: payload.businessRole
  };
}

// Creates user + business + owner membership in a single transaction.
async function register({ email, password, businessName }) {
  const passwordHash = await bcrypt.hash(password, 10);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      const err = new Error('EMAIL_TAKEN');
      err.code = 'EMAIL_TAKEN';
      throw err;
    }

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, is_active, platform_role)
       VALUES ($1, $2, true, 'USER')
       RETURNING id`,
      [email, passwordHash]
    );
    const userId = userResult.rows[0].id;

    const businessResult = await client.query(
      `INSERT INTO businesses (name)
       VALUES ($1)
       RETURNING id`,
      [businessName]
    );
    const businessId = businessResult.rows[0].id;

    await client.query(
      `INSERT INTO memberships (user_id, business_id, role)
       VALUES ($1, $2, 'OWNER')`,
      [userId, businessId]
    );

    await client.query('COMMIT');

    try {
      await botFlowService.saveFlow(businessId, defaultClinicBotFlowNodes);
    } catch (flowErr) {
      require('../utils/logger').warn('default_bot_flow_seed_failed', {
        businessId,
        err: flowErr && flowErr.message ? flowErr.message : flowErr
      });
    }

    const token = generateToken(buildTokenPayload({
      userId,
      platformRole: 'USER',
      businessId,
      businessRole: 'OWNER'
    }));

    return { token, userId, businessId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { login, generateToken, verifyToken, register };
