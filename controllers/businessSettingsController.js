const settingsService = require('../services/settingsService');
const logger = require('../utils/logger');

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function updateBusinessSettings(req, res) {
  try {
    const businessId = req.body.businessId || req.body.business_id;
    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    if (!isUuid(businessId)) {
      return res.status(400).json({ error: 'businessId must be a valid UUID' });
    }

    const exists = await settingsService.businessExists(businessId);
    if (!exists) {
      return res.status(404).json({ error: 'business not found' });
    }

    await settingsService.getOrCreateSettings(businessId);

    const updates = {
      welcome_message: req.body.welcome_message,
      pricing_message: req.body.pricing_message,
      lead_capture_message: req.body.lead_capture_message,
      fallback_message: req.body.fallback_message
    };

    const updated = await settingsService.updateSettings(businessId, updates);
    return res.status(200).json({ ok: true, settings: updated });
  } catch (err) {
    logger.error('update_business_settings_failed', {
      err: err && err.message ? err.message : err
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { updateBusinessSettings };
