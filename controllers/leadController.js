const leadService = require('../services/leadService');
const settingsService = require('../services/settingsService');
const logger = require('../utils/logger');

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

const ALLOWED_STATUSES = new Set(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']);

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

async function updateLead(req, res) {
  try {
    const businessId = req.user && req.user.businessId;
    const leadId = req.params.id;
    const rawName = req.body ? req.body.name : undefined;
    const rawStatus = req.body ? req.body.status : undefined;

    const hasName = rawName !== undefined;
    const hasStatus = rawStatus !== undefined;

    const name = hasName
      ? (rawName === null ? null : String(rawName).trim())
      : undefined;
    const status = hasStatus
      ? String(rawStatus).trim().toUpperCase()
      : undefined;

    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (!isUuid(businessId)) {
      return res.status(400).json({ error: 'businessId must be a valid UUID' });
    }

    if (!isUuid(leadId)) {
      return res.status(400).json({ error: 'lead id must be a valid UUID' });
    }

    if (!hasName && !hasStatus) {
      return res.status(400).json({ error: 'provide at least one field: name or status' });
    }

    if (hasStatus && !ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({
        error: 'status must be one of: NEW, CONTACTED, QUALIFIED, CLOSED'
      });
    }

    const exists = await settingsService.businessExists(businessId);
    if (!exists) {
      return res.status(404).json({ error: 'business not found' });
    }

    const lead = await leadService.updateLeadByIdAndBusiness(leadId, businessId, { name, status });
    if (!lead) {
      return res.status(404).json({ error: 'lead not found for business' });
    }

    return res.status(200).json({ ok: true, lead });
  } catch (err) {
    logger.error('update_lead_failed', {
      err: err && err.message ? err.message : err
    });
    if (err.code === 'invalid_lead_status' || err.message === 'invalid_lead_status') {
      return res.status(400).json({ error: 'invalid status' });
    }
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { listBusinessLeads, updateLead };
