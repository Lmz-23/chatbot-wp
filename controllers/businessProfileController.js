const businessProfileService = require('../services/businessProfileService');
const logger = require('../utils/logger');

const MAX_BUSINESS_NAME_LENGTH = 100;

async function getBusinessProfile(req, res) {
  try {
    const businessId = req.user && req.user.businessId ? req.user.businessId : null;
    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const profile = await businessProfileService.getBusinessProfileById(businessId);
    if (!profile) {
      return res.status(404).json({ error: 'business_not_found' });
    }

    return res.status(200).json(profile);
  } catch (err) {
    logger.error('get_business_profile_failed', {
      err: err && err.message ? err.message : err,
      businessId: req.user && req.user.businessId ? req.user.businessId : null
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function updateBusinessProfile(req, res) {
  try {
    const businessId = req.user && req.user.businessId ? req.user.businessId : null;
    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const rawName = req.body && typeof req.body.name === 'string' ? req.body.name : '';
    const name = rawName.trim();

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    if (name.length > MAX_BUSINESS_NAME_LENGTH) {
      return res.status(400).json({ error: `name must be at most ${MAX_BUSINESS_NAME_LENGTH} characters` });
    }

    const updated = await businessProfileService.updateBusinessNameById(businessId, name);
    if (!updated) {
      return res.status(404).json({ error: 'business_not_found' });
    }

    return res.status(200).json(updated);
  } catch (err) {
    logger.error('update_business_profile_failed', {
      err: err && err.message ? err.message : err,
      businessId: req.user && req.user.businessId ? req.user.businessId : null
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = {
  getBusinessProfile,
  updateBusinessProfile
};