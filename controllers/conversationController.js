const conversationService = require('../services/conversationService');
const settingsService = require('../services/settingsService');
const logger = require('../utils/logger');

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function listBusinessConversations(req, res) {
  try {
    const businessId = req.user && req.user.businessId;
    const limitRaw = req.query.limit;
    const offsetRaw = req.query.offset;

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

    let limit = 50;
    let offset = 0;

    if (limitRaw !== undefined) {
      const parsedLimit = Number.parseInt(limitRaw, 10);
      if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
        return res.status(400).json({ error: 'limit must be a positive integer' });
      }
      limit = Math.min(parsedLimit, 200);
    }

    if (offsetRaw !== undefined) {
      const parsedOffset = Number.parseInt(offsetRaw, 10);
      if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({ error: 'offset must be an integer >= 0' });
      }
      offset = parsedOffset;
    }

    const conversations = await conversationService.listBusinessConversations(businessId, limit, offset);

    return res.status(200).json({ ok: true, conversations, pagination: { limit, offset } });
  } catch (err) {
    logger.error('list_business_conversations_failed', {
      err: err && err.message ? err.message : err
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function getConversationMessages(req, res) {
  try {
    const businessId = req.user && req.user.businessId;
    const conversationId = req.params.id;

    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (!isUuid(businessId)) {
      return res.status(400).json({ error: 'businessId must be a valid UUID' });
    }

    if (!isUuid(conversationId)) {
      return res.status(400).json({ error: 'conversation id must be a valid UUID' });
    }

    const exists = await settingsService.businessExists(businessId);
    if (!exists) {
      return res.status(404).json({ error: 'business not found' });
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
  } catch (err) {
    logger.error('get_conversation_messages_failed', {
      err: err && err.message ? err.message : err
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = { getConversationMessages, listBusinessConversations };
