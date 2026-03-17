const db = require('../db');
const membershipService = require('../services/membershipService');
const settingsService = require('../services/settingsService');
const logger = require('../utils/logger');

async function createBusiness(req, res) {
  try {
    const { name } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'name is required' });
    }

    const q = `
      INSERT INTO businesses (name)
      VALUES ($1)
      RETURNING id, name, created_at`;

    const result = await db.query(q, [name.trim()]);
    const business = result.rows[0];

    // create default settings for new business
    await settingsService.getOrCreateSettings(business.id);

    // if called by a USER (OWNER), automatically create their membership
    if (req.user.platformRole === 'USER') {
      await membershipService.createMembership(req.user.userId, business.id, 'OWNER');
    }

    return res.status(201).json({ ok: true, business });
  } catch (err) {
    logger.error('create_business_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { createBusiness };
