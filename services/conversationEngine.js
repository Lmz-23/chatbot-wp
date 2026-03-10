const intentRouter = require('./intentRouter');
const leadService = require('./leadService');

// generateResponse is async because lead_capture intent writes to the database.
// Callers must await this function.
// meta: { businessId, conversationId, phone } — required for lead_capture intent.
async function generateResponse(message, context, meta = {}) {
  const intent = intentRouter.detectIntent(message);
  const hasHistory = Array.isArray(context) && context.length > 0;

  switch (intent) {
    case 'greeting':
      return 'Hola! Soy tu asistente virtual. ¿Cómo puedo ayudarte hoy?';

    case 'pricing':
      return 'Con gusto. Nuestros precios dependen del servicio y volumen. Si quieres, te comparto una cotización rápida.';

    case 'lead_capture': {
      const { businessId, conversationId, phone } = meta;
      if (businessId && conversationId) {
        const existing = await leadService.getLeadByConversation(conversationId);
        if (!existing) {
          await leadService.createLead(businessId, conversationId, phone, message);
        }
      }
      return 'Perfecto, uno de nuestros asesores te contactará pronto. ¡Gracias por tu interés!';
    }

    default:
      return hasHistory
        ? 'Gracias por tu mensaje. Ya reviso el contexto de la conversación y te ayudo enseguida.'
        : 'Gracias por escribirnos. Cuéntame un poco más para ayudarte mejor.';
  }
}

module.exports = { generateResponse };
