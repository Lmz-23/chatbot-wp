const botFlowService = require('../services/botFlowService');
const { defaultAdminBotFlowNodes } = require('../db/models');
const businessService = require('../services/businessService');
const logger = require('../utils/logger');
const { withAsyncHandler } = require('./asyncHandler');
const { createInternalErrorHandler } = require('./internalErrorHandler');
const {
  validateAccessAndScope,
  validateNodesPayload
} = require('./botSettings/validators');
const { replaceBusinessNameInNodes } = require('./botSettings/nodePresentation');

const getBotSettings = withAsyncHandler(async (req, res) => {
  const access = validateAccessAndScope(req);
  if (access.error) {
    return res.status(access.error.status).json(access.error.body);
  }

  const { businessId } = access;

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
}, createInternalErrorHandler(logger, 'get_bot_settings_failed'));

const updateBotSettings = withAsyncHandler(async (req, res) => {
  const access = validateAccessAndScope(req);
  if (access.error) {
    return res.status(access.error.status).json(access.error.body);
  }

  const { businessId } = access;

  const business = await businessService.getById(businessId);
  if (!business) {
    return res.status(404).json({ error: 'business not found' });
  }

  const payloadValidation = validateNodesPayload(req.body);
  if (payloadValidation.error) {
    return res.status(payloadValidation.error.status).json(payloadValidation.error.body);
  }

  const { nodes } = payloadValidation;

  const saved = await botFlowService.saveFlow(businessId, nodes);
  return res.status(200).json({ ok: true, nodes: saved?.nodes || [] });
}, createInternalErrorHandler(logger, 'update_bot_settings_failed'));

module.exports = { getBotSettings, updateBotSettings };