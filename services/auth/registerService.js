const bcrypt = require('bcrypt');
const db = require('../../db');
const botFlowService = require('../botFlowService');
const { defaultClinicBotFlowNodes } = require('../../db/models');
const logger = require('../../utils/logger');
const { createAuthError } = require('./errorFactory');
const { buildTokenPayload, generateToken } = require('./tokenService');

async function register({ email, password, businessName }) {
  const passwordHash = await bcrypt.hash(password, 10);

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw createAuthError('EMAIL_TAKEN');
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
      logger.warn('default_bot_flow_seed_failed', {
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

module.exports = {
  register
};
