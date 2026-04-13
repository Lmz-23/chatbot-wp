function createEventPipelineService(overrides = {}) {
  const helpers = overrides.helpers || require('../../utils/helpers');
  const db = overrides.db || require('../../db');
  const businessService = overrides.businessService || require('../businessService');
  const messageService = overrides.messageService || require('../messageService');
  const conversationService = overrides.conversationService || require('../conversationService');
  const contextService = overrides.contextService || require('../contextService');
  const conversationEngine = overrides.conversationEngine || require('../conversationEngine');
  const leadService = overrides.leadService || require('../leadService');
  const normalizePhone = overrides.normalizePhone || require('../../utils/phone').normalizePhone;
  const logger = overrides.logger || require('../../utils/logger');
  const createDedupeRegistry = overrides.createDedupeRegistry
    || require('./dedupeRegistry').createDedupeRegistry;

  const DEDUPE_TTL_MS = 1000 * 60 * 5;
  const dedupeRegistry = createDedupeRegistry({ logger, ttlMs: DEDUPE_TTL_MS });

  function getEventBusiness(event) {
    return event.metadata?.phone_number_id || null;
  }

  function registerMessageDedupe(scopeKey, messageId, businessId, whatsappAccountId) {
    return dedupeRegistry.register(scopeKey, messageId, {
      businessId,
      whatsappAccountId: whatsappAccountId || null,
      messageId
    });
  }

  async function saveMessage({
    messageId,
    whatsappAccountId,
    conversationId,
    fromNumber,
    toNumber,
    body,
    direction,
    status
  }) {
    if (!whatsappAccountId) return;

    const q = `
      INSERT INTO messages (
        message_id,
        whatsapp_account_id,
        conversation_id,
        from_number,
        to_number,
        body,
        direction,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (message_id) DO NOTHING`;

    await db.query(q, [
      messageId || null,
      whatsappAccountId,
      conversationId || null,
      fromNumber || null,
      toNumber || null,
      body || null,
      direction || null,
      status || null
    ]);
  }

  async function updateMessageStatus({ messageId, status }) {
    if (!messageId || !status) return;

    const q = `
      UPDATE messages
      SET status = $1
      WHERE message_id = $2`;

    await db.query(q, [status, messageId]);
  }

  async function processStatusEvent(ev, business) {
    const statusEvent = ev.statuses?.[0];
    if (!statusEvent?.id || !statusEvent?.status) return;

    try {
      await updateMessageStatus({ messageId: statusEvent.id, status: statusEvent.status });
      logger.info('message_status_updated', {
        businessId: business.id,
        messageId: statusEvent.id,
        status: statusEvent.status
      });
    } catch (err) {
      logger.error('message_status_update_failed', {
        businessId: business.id,
        messageId: statusEvent.id,
        status: statusEvent.status,
        err: err && err.message ? err.message : err
      });
    }
  }

  function shouldIgnoreIncomingMessage(message, business) {
    if (!message) return true;

    if (message.from === business.phone_number) {
      logger.info('ignored_own_message', { businessId: business.id, messageId: message.id });
      return true;
    }

    const dedupeScope = business.whatsapp_account_id || business.id;
    return !registerMessageDedupe(
      dedupeScope,
      message.id,
      business.id,
      business.whatsapp_account_id
    );
  }

  async function processIncomingMessage(ev, business) {
    const message = ev.messages?.[0];
    if (!message) return;
    if (shouldIgnoreIncomingMessage(message, business)) return;

    const normalizedFromPhone = normalizePhone(message.from);
    const conversation = await conversationService.resolveConversation(
      business.whatsapp_account_id,
      normalizedFromPhone
    );

    const incomingText = message.text?.body || '';
    await saveMessage({
      messageId: message.id,
      whatsappAccountId: business.whatsapp_account_id,
      conversationId: conversation.id,
      fromNumber: normalizedFromPhone,
      toNumber: business.phone_number,
      body: incomingText,
      direction: 'inbound',
      status: 'received'
    });

    await leadService.upsertLeadFromIncomingMessage(business.id, normalizedFromPhone);
    const reopenResult = await leadService.reopenLeadOnIncomingMessage(business.id, normalizedFromPhone);
    logger.info('lead_reopen_attempt', {
      businessId: business.id,
      phone: normalizedFromPhone,
      reopened: reopenResult ? true : false,
      leadStatus: reopenResult?.status
    });

    if (conversation.status !== 'bot') {
      logger.info('bot_reply_skipped_non_bot_status', {
        businessId: business.id,
        conversationId: conversation.id,
        status: conversation.status,
        messageId: message.id
      });
      return;
    }

    const context = await contextService.getConversationContext(conversation.id);
    const engineResult = await conversationEngine.generateResponse(incomingText, context, {
      businessId: business.id,
      conversationId: conversation.id,
      phone: normalizedFromPhone
    });

    if (engineResult.shouldActivateConversation) {
      try {
        await conversationService.updateConversationCurrentNodeByBusiness(
          conversation.id,
          business.id,
          engineResult.nextNodeId || 'escalate_agent'
        );
        await conversationService.updateConversationStatusByBusiness(conversation.id, business.id, 'active');
        logger.info('conversation_escalated_to_agent', {
          businessId: business.id,
          conversationId: conversation.id,
          currentNodeId: engineResult.currentNodeId,
          nextNodeId: engineResult.nextNodeId || 'escalate_agent'
        });
      } catch (flowErr) {
        logger.error('conversation_escalation_failed', {
          businessId: business.id,
          conversationId: conversation.id,
          err: flowErr && flowErr.message ? flowErr.message : flowErr
        });
      }

      return;
    }

    if (!engineResult.shouldSendMessage || !engineResult.replyText) {
      return;
    }

    const sendResult = await messageService.sendText({ business, to: normalizedFromPhone, body: engineResult.replyText });

    const outboundMessageId = sendResult?.messages?.[0]?.id || null;
    await saveMessage({
      messageId: outboundMessageId,
      whatsappAccountId: business.whatsapp_account_id,
      conversationId: conversation.id,
      fromNumber: business.phone_number,
      toNumber: normalizedFromPhone,
      body: engineResult.replyText,
      direction: 'outbound',
      status: 'sent'
    });

    if (engineResult.usedFlow && engineResult.nextNodeId) {
      try {
        await conversationService.updateConversationCurrentNodeByBusiness(
          conversation.id,
          business.id,
          engineResult.nextNodeId
        );
      } catch (nodeErr) {
        logger.error('conversation_node_update_failed', {
          businessId: business.id,
          conversationId: conversation.id,
          nextNodeId: engineResult.nextNodeId,
          err: nodeErr && nodeErr.message ? nodeErr.message : nodeErr
        });
      }
    }

    logger.info('reply_sent', {
      businessId: business.id,
      conversationId: conversation.id,
      messageId: message.id
    });
  }

  async function handleIncoming(payload) {
    const events = helpers.extractEvents(payload);
    if (!events.length) return;

    for (const ev of events) {
      const phoneNumberId = getEventBusiness(ev);
      if (!phoneNumberId) {
        logger.warn('event_missing_phone_number_id', { event: ev });
        continue;
      }

      const business = await businessService.getByPhoneNumberId(phoneNumberId);
      if (!business) {
        logger.warn('unknown_business', { phoneNumberId });
        continue;
      }

      await processStatusEvent(ev, business);

      try {
        await processIncomingMessage(ev, business);
      } catch (err) {
        logger.error('reply_failed', { businessId: business.id, err: err && err.message ? err.message : err });
      }
    }
  }

  return {
    handleIncoming
  };
}

const defaultPipeline = createEventPipelineService();

module.exports = {
  handleIncoming: defaultPipeline.handleIncoming,
  createEventPipelineService
};
