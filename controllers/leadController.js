const leadService = require('../services/leadService');
const settingsService = require('../services/settingsService');
const logger = require('../utils/logger');

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const ALLOWED_STATUSES = new Set(['new', 'contacted', 'qualified', 'closed']);

async function listBusinessLeads(req, res) {
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

    const leads = await leadService.listLeadsByBusinessId(businessId);
    return res.status(200).json({ ok: true, leads });
  } catch (err) {
    logger.error('list_business_leads_failed', {
      err: err && err.message ? err.message : err
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function updateLeadStatus(req, res) {
  try {
    const businessId = req.user && req.user.businessId;
    const leadId = req.params.id;
    const status = req.body && typeof req.body.status === 'string'
      ? req.body.status.trim().toLowerCase()
      : '';

    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (!isUuid(businessId)) {
      return res.status(400).json({ error: 'businessId must be a valid UUID' });
    }

    if (!isUuid(leadId)) {
      return res.status(400).json({ error: 'lead id must be a valid UUID' });
    }

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({
        error: 'status must be one of: new, contacted, qualified, closed'
      });
    }

    const exists = await settingsService.businessExists(businessId);
    if (!exists) {
      return res.status(404).json({ error: 'business not found' });
    }

    const lead = await leadService.updateLeadStatusByBusiness(leadId, businessId, status);
    if (!lead) {
      return res.status(404).json({ error: 'lead not found for business' });
    }

    return res.status(200).json({ ok: true, lead });
  } catch (err) {
    logger.error('update_lead_status_failed', {
      err: err && err.message ? err.message : err
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { listBusinessLeads, updateLeadStatus };
