const intentRouter = require('./intentRouter');
const leadService = require('./leadService');
const settingsService = require('./settingsService');
const botFlowService = require('./botFlowService');
const conversationService = require('./conversationService');
const logger = require('../utils/logger');

const DEFAULT_MESSAGES = {
  welcome_message: 'Hola! Soy tu asistente virtual. ¿Cómo puedo ayudarte hoy?',
  pricing_message: 'Con gusto. Nuestros precios dependen del servicio y volumen. Si quieres, te comparto una cotización rápida.',
  lead_capture_message: 'Perfecto, uno de nuestros asesores te contactará pronto. ¡Gracias por tu interés!',
  fallback_message: 'Gracias por tu mensaje. Ya reviso el contexto de la conversación y te ayudo enseguida.'
};

function normalizeText(value) {
  return (value || '').toString().trim().toLowerCase();
}

function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function findNodeById(nodes, nodeId) {
  if (!isNonEmptyArray(nodes) || !nodeId) return null;
  return nodes.find((node) => node && node.id === nodeId) || null;
}

function matchTransition(node, messageText) {
  const transitions = Array.isArray(node?.transitions) ? node.transitions : [];
  const normalizedMessage = normalizeText(messageText);

  for (const transition of transitions) {
    const keywords = Array.isArray(transition?.keywords) ? transition.keywords : [];
    const hasMatch = keywords.some((keyword) => normalizedMessage.includes(normalizeText(keyword)));
    if (hasMatch) {
      return transition?.next || null;
    }
  }

  return node?.default || null;
}

async function buildLegacyResponse(message, context, meta = {}) {
  const intent = intentRouter.detectIntent(message);
  const hasHistory = Array.isArray(context) && context.length > 0;
  let settings = null;

  try {
    if (meta.businessId) {
      settings = await settingsService.getOrCreateSettings(meta.businessId);
    }
  } catch (err) {
    logger.error('settings_load_failed', {
      businessId: meta.businessId || null,
      err: err && err.message ? err.message : err
    });
  }

  const messages = {
    welcome_message: settings?.welcome_message || DEFAULT_MESSAGES.welcome_message,
    pricing_message: settings?.pricing_message || DEFAULT_MESSAGES.pricing_message,
    lead_capture_message: settings?.lead_capture_message || DEFAULT_MESSAGES.lead_capture_message,
    fallback_message: settings?.fallback_message || DEFAULT_MESSAGES.fallback_message
  };

  switch (intent) {
    case 'greeting':
      return {
        replyText: messages.welcome_message,
        nextNodeId: null,
        shouldSendMessage: true,
        shouldActivateConversation: false,
        usedFlow: false,
        fallbackUsed: true,
        currentNodeId: null
      };

    case 'pricing':
      return {
        replyText: messages.pricing_message,
        nextNodeId: null,
        shouldSendMessage: true,
        shouldActivateConversation: false,
        usedFlow: false,
        fallbackUsed: true,
        currentNodeId: null
      };

    case 'lead_capture': {
      const { businessId, phone } = meta;
      if (businessId && phone) {
        try {
          await leadService.upsertLeadFromIncomingMessage(businessId, phone);
        } catch (leadErr) {
          // Log but never block the reply to the user
          logger.error('lead_capture_failed', {
            businessId,
            phone,
            err: leadErr && leadErr.message ? leadErr.message : leadErr
          });
        }
      }

      return {
        replyText: messages.lead_capture_message,
        nextNodeId: null,
        shouldSendMessage: true,
        shouldActivateConversation: false,
        usedFlow: false,
        fallbackUsed: true,
        currentNodeId: null
      };
    }

    default:
      return {
        replyText: hasHistory ? messages.fallback_message : messages.fallback_message,
        nextNodeId: null,
        shouldSendMessage: true,
        shouldActivateConversation: false,
        usedFlow: false,
        fallbackUsed: true,
        currentNodeId: null
      };
  }
}

// Generates the next bot action using the business flow when available.
// When there is no flow configured, the legacy intentRouter remains the fallback.
// meta: { businessId, conversationId, phone }.
async function generateResponse(message, context, meta = {}) {
  const messageText = normalizeText(message);
  const conversationId = meta.conversationId || null;
  const businessId = meta.businessId || null;

  let currentNodeId = normalizeText(meta.currentNode) || 'start';

  if (businessId && conversationId) {
    try {
      const conversation = await conversationService.getConversationWithBusiness(conversationId, businessId);
      if (conversation && conversation.current_node) {
        currentNodeId = normalizeText(conversation.current_node) || 'start';
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
    return buildLegacyResponse(message, context, meta);
  }

  let flow = null;
  try {
    flow = await botFlowService.getFlowByBusiness(businessId);
  } catch (err) {
    logger.warn('bot_flow_load_failed', {
      businessId,
      err: err && err.message ? err.message : err
    });
  }

  if (!flow || !isNonEmptyArray(flow.nodes)) {
    return buildLegacyResponse(message, context, meta);
  }

  const currentNode = findNodeById(flow.nodes, currentNodeId)
    || findNodeById(flow.nodes, 'start')
    || flow.nodes[0]
    || null;

  if (!currentNode) {
    return buildLegacyResponse(message, context, meta);
  }

  const nextNodeId = matchTransition(currentNode, messageText);
  if (!nextNodeId) {
    return buildLegacyResponse(message, context, meta);
  }

  if (nextNodeId === 'escalate_agent') {
    return {
      replyText: null,
      nextNodeId,
      shouldSendMessage: false,
      shouldActivateConversation: true,
      usedFlow: true,
      fallbackUsed: false,
      currentNodeId: currentNode.id
    };
  }

  const nextNode = findNodeById(flow.nodes, nextNodeId);
  if (!nextNode || typeof nextNode.message !== 'string' || !nextNode.message.trim()) {
    return buildLegacyResponse(message, context, meta);
  }

  return {
    replyText: nextNode.message,
    nextNodeId: nextNode.id,
    shouldSendMessage: true,
    shouldActivateConversation: false,
    usedFlow: true,
    fallbackUsed: false,
    currentNodeId: currentNode.id
  };
}

module.exports = { generateResponse };