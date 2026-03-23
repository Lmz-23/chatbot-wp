const intentRouter = require('./intentRouter');
const leadService = require('./leadService');
const settingsService = require('./settingsService');
const logger = require('../utils/logger');

const DEFAULT_MESSAGES = {
  welcome_message: 'Hola! Soy tu asistente virtual. ¿Cómo puedo ayudarte hoy?',
  pricing_message: 'Con gusto. Nuestros precios dependen del servicio y volumen. Si quieres, te comparto una cotización rápida.',
  lead_capture_message: 'Perfecto, uno de nuestros asesores te contactará pronto. ¡Gracias por tu interés!',
  fallback_message: 'Gracias por tu mensaje. Ya reviso el contexto de la conversación y te ayudo enseguida.'
};

// generateResponse is async because lead_capture intent writes to the database.
// Callers must await this function.
// meta: { businessId, conversationId, phone } — required for lead_capture intent.
async function generateResponse(message, context, meta = {}) {
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
      return messages.welcome_message;

    case 'pricing':
      return messages.pricing_message;

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
      return messages.lead_capture_message;
    }

    default:
      return hasHistory
        ? messages.fallback_message
        : messages.fallback_message;
  }
}

module.exports = { generateResponse };
