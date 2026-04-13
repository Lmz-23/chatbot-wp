const intentRouter = require('./intentRouter');
const leadService = require('./leadService');
const settingsService = require('./settingsService');
const botFlowService = require('./botFlowService');
const conversationService = require('./conversationService');
const businessService = require('./businessService');
const { DEFAULT_BOT_MESSAGES } = require('./defaultMessages');
const logger = require('../utils/logger');

/**
 * Normaliza texto para comparaciones semanticas del flujo.
 * @param {unknown} value - Valor de entrada potencialmente vacio o no string.
 * @returns {string} Texto en minusculas y sin espacios extremos.
 */
function normalizeText(value) {
  return (value || '').toString().trim().toLowerCase();
}

/**
 * Verifica que el valor sea un arreglo con al menos un elemento.
 * @param {unknown} value - Valor a validar.
 * @returns {boolean} true cuando es arreglo no vacio.
 */
function isNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Busca un nodo por id dentro de un flujo.
 * @param {Array<object>} nodes - Nodos del flujo.
 * @param {string} nodeId - Id del nodo a ubicar.
 * @returns {object|null} Nodo encontrado o null.
 */
function findNodeById(nodes, nodeId) {
  if (!isNonEmptyArray(nodes) || !nodeId) return null;
  return nodes.find((node) => node && node.id === nodeId) || null;
}

/**
 * Resuelve la siguiente transicion de un nodo segun palabras clave.
 * @param {object} node - Nodo actual con transitions/default.
 * @param {string} messageText - Mensaje entrante del usuario.
 * @returns {string|null} Id del siguiente nodo o null si no hay transicion.
 */
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

/**
 * Reemplaza placeholders entre corchetes por el nombre del negocio.
 * @param {string} text - Texto base potencialmente con placeholders.
 * @param {string} businessName - Nombre del negocio.
 * @returns {string} Texto con placeholders reemplazados.
 */
function replaceBusinessPlaceholders(text, businessName) {
  if (typeof text !== 'string') return text;

  const normalizedBusinessName = (businessName || '').toString().trim();
  if (!normalizedBusinessName) return text;

  // Replaces any token like [Nombre Clinica], [Negocio], [Empresa], etc.
  return text.replace(/\[[^\]]+\]/g, normalizedBusinessName);
}

/**
 * Genera respuesta de respaldo basada en el router legacy de intents.
 * @param {string} message - Mensaje entrante.
 * @param {Array<object>} context - Historial de contexto conversacional.
 * @param {{ businessId?: string, phone?: string }} meta - Metadatos de tenant y telefono.
 * @returns {Promise<object>} Resultado de respuesta con flags de envio/flujo.
 * @throws {Error} Puede propagar errores no controlados de dependencias.
 */
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
    welcome_message: settings?.welcome_message || DEFAULT_BOT_MESSAGES.welcome_message,
    pricing_message: settings?.pricing_message || DEFAULT_BOT_MESSAGES.pricing_message,
    lead_capture_message: settings?.lead_capture_message || DEFAULT_BOT_MESSAGES.lead_capture_message,
    fallback_message: settings?.fallback_message || DEFAULT_BOT_MESSAGES.fallback_message
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
/**
 * Genera la siguiente accion del bot usando flujo configurable por negocio.
 * @param {string} message - Mensaje entrante del usuario.
 * @param {Array<object>} context - Historial de mensajes de la conversacion.
 * @param {{ businessId?: string, conversationId?: string, phone?: string, currentNode?: string }} meta - Contexto de negocio y conversacion.
 * @returns {Promise<object>} Objeto con replyText, nextNodeId y banderas de control.
 * @throws {Error} Puede lanzar errores de acceso a servicios externos o DB.
 */
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

  let businessName = null;
  try {
    const business = await businessService.getById(businessId);
    businessName = business && business.name ? business.name : null;
  } catch (err) {
    logger.warn('business_name_load_failed', {
      businessId,
      err: err && err.message ? err.message : err
    });
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
    replyText: replaceBusinessPlaceholders(nextNode.message, businessName),
    nextNodeId: nextNode.id,
    shouldSendMessage: true,
    shouldActivateConversation: false,
    usedFlow: true,
    fallbackUsed: false,
    currentNodeId: currentNode.id
  };
}

module.exports = { generateResponse };