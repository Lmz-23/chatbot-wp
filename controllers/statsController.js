const settingsService = require('../services/settingsService');
const statsService = require('../services/statsService');
const logger = require('../utils/logger');

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getBusinessStats(req, res) {
  try {
    const businessId = req.user && req.user.businessId;

    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (!isUuid(businessId)) {
      return res.status(400).json({ error: 'businessId must be a valid UUID' });
    }

    const exists = await settingsService.businessExists(businessId);
    if (!exists) {
      return res.status(404).json({ error: 'business not found' });
    }

    const stats = await statsService.getBusinessStats(businessId);
    return res.status(200).json({ ok: true, stats });
  } catch (err) {
    logger.error('get_business_stats_failed', {
      err: err && err.message ? err.message : err
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { getBusinessStats };
