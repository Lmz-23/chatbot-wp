const botFlowService = require('../services/botFlowService');
const { defaultClinicBotFlowNodes } = require('../db/models');
const logger = require('../utils/logger');

function getBusinessIdFromUser(req) {
  return req.user && req.user.businessId ? req.user.businessId : null;
}

async function getBotSettings(req, res) {
  try {
    const businessId = getBusinessIdFromUser(req);
    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    let flow = await botFlowService.getFlowByBusiness(businessId);
    if (!flow) {
      flow = await botFlowService.saveFlow(businessId, defaultClinicBotFlowNodes);
    }

    return res.status(200).json({ ok: true, nodes: flow?.nodes || [] });
  } catch (err) {
    logger.error('get_bot_settings_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function updateBotSettings(req, res) {
  try {
    const businessId = getBusinessIdFromUser(req);
    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const nodes = req.body && req.body.nodes;
    if (!Array.isArray(nodes)) {
      return res.status(400).json({ error: 'nodes must be an array' });
    }

    const saved = await botFlowService.saveFlow(businessId, nodes);
    return res.status(200).json({ ok: true, nodes: saved?.nodes || [] });
  } catch (err) {
    logger.error('update_bot_settings_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { getBotSettings, updateBotSettings };