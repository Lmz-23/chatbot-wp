const settingsService = require('./settingsService');
const conversationService = require('./conversationService');
const leadService = require('./leadService');
const businessService = require('./businessService');
const { DEFAULT_BOT_MESSAGES } = require('./defaultMessages');
const { generateBotResponse, extractClientData } = require('./aiService');
const logger = require('../utils/logger');
function buildFallbackResponse(settings) {
  return settings?.fallback_message || DEFAULT_BOT_MESSAGES.fallback_message;
}

async function generateResponse(message, context, meta = {}) {
  const conversationId = meta.conversationId || null;
  const businessId = meta.businessId || null;
  let conversationStatus = null;

  let currentNodeId = 'start';

  if (businessId && conversationId) {
    try {
      const conversation = await conversationService.getConversationWithBusiness(conversationId, businessId);
      if (conversation) {
        conversationStatus = conversation.status ? String(conversation.status).trim().toLowerCase() : null;

        if (
          conversationStatus === 'closed'
          || conversation.current_node === 'escalate_agent'
          || conversation.current_node === 'escalate_urgent'
        ) {
          currentNodeId = 'start';
        }
      }
    } catch (err) {
      logger.warn('conversation_flow_context_failed', {
        businessId,
        conversationId,
        err: err && err.message ? err.message : err
      });
    }
  }

  if (!businessId) {
    return {
      replyText: DEFAULT_BOT_MESSAGES.fallback_message,
      nextNodeId: null,
      shouldSendMessage: true,
      shouldActivateConversation: false,
      usedFlow: false,
      fallbackUsed: true,
      currentNodeId: null,
      extractedLeadData: null
    };
  }

  let businessName = 'tu negocio';
  let settings = null;
  let lead = null;
  try {
    const [business, loadedSettings] = await Promise.all([
      businessService.getById(businessId),
      settingsService.getOrCreateSettings(businessId)
    ]);

    businessName = business && business.name ? business.name : businessName;
    settings = loadedSettings;
  } catch (err) {
    logger.warn('business_context_load_failed', {
      businessId,
      err: err && err.message ? err.message : err
    });
  }

  if (meta.phone) {
    try {
      lead = await leadService.findLeadByBusinessAndPhone(businessId, meta.phone);
    } catch (err) {
      logger.warn('lead_context_load_failed', {
        businessId,
        phone: meta.phone,
        err: err && err.message ? err.message : err
      });
    }
  }

  const conversationHistory = Array.isArray(context) ? context : [];

  logger.info('bot_engine_triggered', {
    conversationId,
    businessId,
    status: conversationStatus
  });

  const extractedLeadData = await (async () => {
    try {
      return await extractClientData(conversationHistory);
    } catch (err) {
      logger.warn('groq_extraction_failed', {
        businessId,
        conversationId,
        err: err && err.message ? err.message : err
      });
      return null;
    }
  })();

  if (extractedLeadData && meta.phone) {
    try {
      const updatedLead = await leadService.upsertLeadFromConversationData(businessId, meta.phone, extractedLeadData);
      if (updatedLead && updatedLead.name) {
        lead = updatedLead;
      }
    } catch (leadErr) {
      logger.warn('lead_extraction_persist_failed', {
        businessId,
        phone: meta.phone,
        err: leadErr && leadErr.message ? leadErr.message : leadErr
      });
    }
  }

  let replyText = null;
  try {
    replyText = await generateBotResponse(businessName, conversationHistory, message, settings || {}, lead || {});
  } catch (err) {
    logger.warn('groq_reply_failed', {
      businessId,
      conversationId,
      err: err && err.message ? err.message : err
    });
  }

  return {
    replyText: replyText && replyText.trim() ? replyText.trim() : buildFallbackResponse(settings),
    nextNodeId: null,
    shouldSendMessage: true,
    shouldActivateConversation: false,
    usedFlow: false,
    fallbackUsed: !replyText,
    currentNodeId,
    extractedLeadData
  };
}

module.exports = { generateResponse };