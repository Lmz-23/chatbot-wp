const conversationService = require('../services/conversationService');
const settingsService = require('../services/settingsService');
const messageService = require('../services/messageService');
const leadService = require('../services/leadService');
const logger = require('../utils/logger');
const { withAsyncHandler } = require('./asyncHandler');
const { createInternalErrorHandler } = require('./internalErrorHandler');
const { sendMessageFlow } = require('./conversation/sendMessageFlow');
const {
  getBusinessIdFromRequest,
  parsePagination,
  validateBusinessScope,
  validateConversationId
} = require('./conversation/validators');

// Lists business conversations with pagination and ownership checks.
const listBusinessConversations = withAsyncHandler(async (req, res) => {
  const businessId = getBusinessIdFromRequest(req);
  const limitRaw = req.query.limit;
  const offsetRaw = req.query.offset;

  const businessValidation = await validateBusinessScope(businessId, settingsService);
  if (businessValidation) {
    return res.status(businessValidation.status).json(businessValidation.body);
  }

  const pagination = parsePagination(limitRaw, offsetRaw);
  if (pagination.error) {
    return res.status(pagination.error.status).json(pagination.error.body);
  }

  const { limit, offset } = pagination;

  const conversations = await conversationService.listBusinessConversations(businessId, limit, offset);

  return res.status(200).json({ ok: true, conversations, pagination: { limit, offset } });
}, createInternalErrorHandler(logger, 'list_business_conversations_failed'));

// Returns full message history for a conversation thread.
const getConversationMessages = withAsyncHandler(async (req, res) => {
  const businessId = getBusinessIdFromRequest(req);
  const conversationId = req.params.id;

  const businessValidation = await validateBusinessScope(businessId, settingsService);
  if (businessValidation) {
    return res.status(businessValidation.status).json(businessValidation.body);
  }

  const conversationValidation = validateConversationId(conversationId);
  if (conversationValidation) {
    return res.status(conversationValidation.status).json(conversationValidation.body);
  }

  const messages = await conversationService.listConversationMessagesByBusiness(
    conversationId,
    businessId
  );

  return res.status(200).json({
    ok: true,
    conversationId,
    messages
  });
}, createInternalErrorHandler(logger, 'get_conversation_messages_failed'));

// Sends an agent message, persists it, and promotes lead/conversation state.
const sendMessage = withAsyncHandler(async (req, res) => {
  const businessId = getBusinessIdFromRequest(req);
  const conversationId = req.params.id;
  const { text } = req.body;

  const businessValidation = await validateBusinessScope(businessId, settingsService);
  if (businessValidation) {
    return res.status(businessValidation.status).json(businessValidation.body);
  }

  const conversationValidation = validateConversationId(conversationId);
  if (conversationValidation) {
    return res.status(conversationValidation.status).json(conversationValidation.body);
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'text is required and must be non-empty' });
  }

  const conversation = await conversationService.getConversationWithBusiness(
    conversationId,
    businessId
  );

  if (!conversation) {
    return res.status(404).json({ error: 'conversation not found' });
  }

  const response = await sendMessageFlow({
    conversation,
    conversationId,
    businessId,
    text,
    conversationService,
    messageService,
    leadService,
    logger
  });

  return res.status(response.status).json(response.body);
}, createInternalErrorHandler(logger, 'send_message_failed'));

// Manually sets conversation ownership state (active/closed).
const updateConversationStatus = withAsyncHandler(async (req, res) => {
  const businessId = getBusinessIdFromRequest(req);
  const conversationId = req.params.id;
  const { status } = req.body || {};

  const businessValidation = await validateBusinessScope(businessId, settingsService);
  if (businessValidation) {
    return res.status(businessValidation.status).json(businessValidation.body);
  }

  const conversationValidation = validateConversationId(conversationId);
  if (conversationValidation) {
    return res.status(conversationValidation.status).json(conversationValidation.body);
  }

  if (status !== 'active' && status !== 'closed') {
    return res.status(400).json({ error: 'status must be one of: active, closed' });
  }

  const updated = await conversationService.updateConversationStatusByBusiness(
    conversationId,
    businessId,
    status
  );

  if (!updated) {
    return res.status(404).json({ error: 'conversation not found' });
  }

  return res.status(200).json({ ok: true, conversation: updated });
}, createInternalErrorHandler(logger, 'update_conversation_status_failed'));

module.exports = {
  getConversationMessages,
  listBusinessConversations,
  sendMessage,
  updateConversationStatus
};
