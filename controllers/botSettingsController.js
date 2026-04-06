const botFlowService = require('../services/botFlowService');
const { defaultAdminBotFlowNodes } = require('../db/models');
const businessService = require('../services/businessService');
const logger = require('../utils/logger');

function getBusinessIdFromUser(req) {
  return req.user && req.user.businessId ? req.user.businessId : null;
}

function getScopedBusinessId(req) {
  const user = req.user || null;
  const requestedBusinessId = req.query && typeof req.query.businessId === 'string'
    ? req.query.businessId.trim()
    : '';

  if (user && user.platformRole === 'PLATFORM_ADMIN' && requestedBusinessId) {
    return requestedBusinessId;
  }

  return getBusinessIdFromUser(req);
}

function canManageBotSettings(req) {
  const user = req.user || null;
  if (!user) return false;
  if (user.platformRole === 'PLATFORM_ADMIN') return true;
  return user.businessRole === 'OWNER';
}

function replaceBusinessNameInNodes(nodes, businessName) {
  if (!Array.isArray(nodes)) return [];
  const normalizedBusinessName = (businessName || '').toString().trim();
  if (!normalizedBusinessName) return nodes;

  return nodes.map((node) => {
    if (!node || typeof node !== 'object') return node;
    const message = typeof node.message === 'string'
      ? node.message.replace(/\[business_name\]/gi, normalizedBusinessName)
      : node.message;

    return {
      ...node,
      message
    };
  });
}

async function getBotSettings(req, res) {
  try {
    if (!canManageBotSettings(req)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const businessId = getScopedBusinessId(req);
    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const business = await businessService.getById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'business not found' });
    }

    let flow = await botFlowService.getFlowByBusiness(businessId);
    if (!flow) {
      flow = await botFlowService.saveFlow(businessId, defaultAdminBotFlowNodes);
    }

    const previewNodes = replaceBusinessNameInNodes(flow?.nodes || [], business.name);
    return res.status(200).json({ ok: true, nodes: previewNodes });
  } catch (err) {
    logger.error('get_bot_settings_failed', { err: err && err.message ? err.message : err });
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function updateBotSettings(req, res) {
  try {
    if (!canManageBotSettings(req)) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const businessId = getScopedBusinessId(req);
    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const business = await businessService.getById(businessId);
    if (!business) {
      return res.status(404).json({ error: 'business not found' });
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