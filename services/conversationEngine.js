function generateResponse(message, context) {
  const text = (message || '').toString().trim().toLowerCase();

  if (text.includes('hola')) {
    return 'Hola! Soy tu asistente virtual. Como puedo ayudarte hoy?';
  }

  if (text.includes('precio')) {
    return 'Con gusto. Nuestros precios dependen del servicio y volumen. Si quieres, te comparto una cotizacion rapida.';
  }

  // Keep a deterministic fallback while the rule engine is still minimal.
  const hasHistory = Array.isArray(context) && context.length > 0;
  if (hasHistory) {
    return 'Gracias por tu mensaje. Ya reviso el contexto de la conversacion y te ayudo enseguida.';
  }

  return 'Gracias por escribirnos. Cuentame un poco mas para ayudarte mejor.';
}

module.exports = { generateResponse };
