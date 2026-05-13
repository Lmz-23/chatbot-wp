const leadService = require('../services/leadService');
const logger = require('../utils/logger');

const ALLOWED_LEAD_STATUSES = new Set(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED']);

/**
 * GET /business/leads
 * Retorna todos los leads del negocio con estado de conversación asociada.
 */
async function getBusinessLeads(req, res) {
  try {
    const businessId = req.user && req.user.businessId ? req.user.businessId : null;
    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const leads = await leadService.getLeadsWithConversationStatus(businessId);
    return res.status(200).json({ ok: true, leads });
  } catch (err) {
    logger.error('get_business_leads_failed', {
      err: err && err.message ? err.message : err,
      businessId: req.user && req.user.businessId ? req.user.businessId : null
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * GET /business/leads/:leadId
 * Retorna detalles de un lead específico.
 */
async function getLeadById(req, res) {
  try {
    const businessId = req.user && req.user.businessId ? req.user.businessId : null;
    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { leadId } = req.params;
    if (!leadId) {
      return res.status(400).json({ error: 'leadId required' });
    }

    const lead = await leadService.getLeadWithConversationStatus(leadId, businessId);
    if (!lead) {
      return res.status(404).json({ error: 'lead_not_found' });
    }

    return res.status(200).json({ ok: true, lead });
  } catch (err) {
    logger.error('get_lead_by_id_failed', {
      err: err && err.message ? err.message : err,
      businessId: req.user && req.user.businessId ? req.user.businessId : null
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

/**
 * PATCH /business/leads/:leadId
 * Actualiza nombre o estado de un lead.
 */
async function updateLead(req, res) {
  try {
    const businessId = req.user && req.user.businessId ? req.user.businessId : null;
    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const { leadId } = req.params;
    if (!leadId) {
      return res.status(400).json({ error: 'leadId required' });
    }

    const { name, status } = req.body;
    const updates = {};

    if (name !== undefined) {
      updates.name = name === null || name === '' ? null : String(name).trim();
    }

    if (status !== undefined) {
      const normalizedStatus = String(status || '').toUpperCase();
      if (!ALLOWED_LEAD_STATUSES.has(normalizedStatus)) {
        return res.status(400).json({ error: 'invalid_lead_status' });
      }
      updates.status = normalizedStatus;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'no_updates_provided' });
    }

    const lead = await leadService.updateLeadById(leadId, businessId, updates);
    if (!lead) {
      return res.status(404).json({ error: 'lead_not_found' });
    }

    // Recargar con conversation_status
    const enrichedLead = await leadService.getLeadWithConversationStatus(leadId, businessId);
    return res.status(200).json({ ok: true, lead: enrichedLead || lead });
  } catch (err) {
    logger.error('update_lead_failed', {
      err: err && err.message ? err.message : err,
      businessId: req.user && req.user.businessId ? req.user.businessId : null
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = {
  getBusinessLeads,
  getLeadById,
  updateLead
};
