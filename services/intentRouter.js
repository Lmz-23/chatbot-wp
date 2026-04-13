const RULES = [
  { intent: 'greeting',     keywords: ['hola', 'buenas', 'buenos', 'hi', 'hey'] },
  { intent: 'pricing',      keywords: ['precio', 'precios', 'costo', 'costos', 'cuanto', 'cuánto', 'tarifa', 'valor'] },
  { intent: 'lead_capture', keywords: ['quiero', 'interesado', 'interesada', 'comprar', 'contratar', 'me interesa', 'información', 'informacion', 'asesor', 'cotizacion', 'cotización'] },
];

/**
 * Detecta el intent del mensaje usando reglas simples por palabras clave.
 * @param {string} message - Texto entrante del usuario.
 * @returns {string} Intent detectado o fallback si no hay coincidencias.
 */
function detectIntent(message) {
  const text = (message || '').toString().trim().toLowerCase();

  for (const rule of RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.intent;
    }
  }

  return 'fallback';
}

module.exports = { detectIntent };
