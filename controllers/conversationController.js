const conversationService = require('../services/conversationService');
const settingsService = require('../services/settingsService');
const messageService = require('../services/messageService');
const leadService = require('../services/leadService');
const { normalizePhone } = require('../utils/phone');
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

async function sendMessage(req, res) {
  try {
    const businessId = req.user && req.user.businessId;
    const conversationId = req.params.id;
    const { text } = req.body;

    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (!isUuid(businessId)) {
      return res.status(400).json({ error: 'businessId must be a valid UUID' });
    }

    if (!isUuid(conversationId)) {
      return res.status(400).json({ error: 'conversation id must be a valid UUID' });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'text is required and must be non-empty' });
    }

    const exists = await settingsService.businessExists(businessId);
    if (!exists) {
      return res.status(404).json({ error: 'business not found' });
    }

    const conversation = await conversationService.getConversationWithBusiness(
      conversationId,
      businessId
    );

    if (!conversation) {
      return res.status(404).json({ error: 'conversation not found' });
    }

    // Prepare business object for messageService
    const business = {
      id: conversation.business_id,
      name: conversation.business_name,
      token: conversation.token,
      phone_number_id: conversation.phone_number_id
    };
    const normalizedPhone = normalizePhone(conversation.user_phone);

    // Agent takes ownership of the conversation.
    await conversationService.markConversationActive(conversationId);

    try {
      // Send via WhatsApp API
      await messageService.sendText({
        business,
        to: normalizedPhone,
        body: text.trim()
      });

      // Save to database
      const savedMessage = await conversationService.saveMessage(
        conversationId,
        'outbound',
        text.trim(),
        'agent_sent'
      );

      // The agent can only send from a valid conversation context.
      const leadResult = await leadService.promoteLeadOnAgentMessage(businessId, normalizedPhone);
      logger.info('lead_promoted_on_agent_message', {
        conversationId,
        businessId,
        phone: normalizedPhone,
        leadUpdated: leadResult ? true : false,
        leadStatus: leadResult?.status
      });

      logger.info('message_sent_success', {
        conversationId,
        businessId,
        messageId: savedMessage.id
      });

      return res.status(200).json({
        ok: true,
        message: savedMessage
      });
    } catch (whatsappError) {
      logger.error('whatsapp_send_failed', {
        conversationId,
        businessId,
        err: whatsappError && whatsappError.message ? whatsappError.message : whatsappError
      });

      // Still save to database with 'failed' status
      const failedMessage = await conversationService.saveMessage(
        conversationId,
        'outbound',
        text.trim(),
        'agent_failed'
      );

      return res.status(500).json({
        error: 'whatsapp_send_failed',
        message: failedMessage,
        details: whatsappError && whatsappError.message ? whatsappError.message : 'Unknown error'
      });
    }
  } catch (err) {
    logger.error('send_message_failed', {
      err: err && err.message ? err.message : err
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

async function updateConversationStatus(req, res) {
  try {
    const businessId = req.user && req.user.businessId;
    const conversationId = req.params.id;
    const { status } = req.body || {};

    if (!businessId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (!isUuid(businessId)) {
      return res.status(400).json({ error: 'businessId must be a valid UUID' });
    }

    if (!isUuid(conversationId)) {
      return res.status(400).json({ error: 'conversation id must be a valid UUID' });
    }

    if (status !== 'active' && status !== 'closed') {
      return res.status(400).json({ error: 'status must be one of: active, closed' });
    }

    const exists = await settingsService.businessExists(businessId);
    if (!exists) {
      return res.status(404).json({ error: 'business not found' });
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
  } catch (err) {
    logger.error('update_conversation_status_failed', {
      err: err && err.message ? err.message : err
    });
    return res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = {
  getConversationMessages,
  listBusinessConversations,
  sendMessage,
  updateConversationStatus
};
