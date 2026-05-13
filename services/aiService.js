const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function formatServices(settings = {}) {
  const services = Array.isArray(settings.services) ? settings.services : [];
  const formatted = services
    .map((service) => {
      if (!service || typeof service !== 'object') return null;
      const name = String(service.name || '').trim();
      const description = String(service.description || '').trim();
      const price = String(service.price || '').trim();

      if (!name && !description && !price) return null;
      return `- ${name || 'Servicio'}: ${description || 'Sin descripción'} | Precio: ${price || 'Consultar con asesor'}`;
    })
    .filter(Boolean)
    .join('\n');

  return formatted || 'Consultar con asesor';
}

function formatFaq(settings = {}) {
  const faq = Array.isArray(settings.faq) ? settings.faq : [];
  const formatted = faq
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const question = String(item.question || '').trim();
      const answer = String(item.answer || '').trim();
      if (!question && !answer) return null;
      return `P: ${question || 'Pregunta'}\nR: ${answer || 'Respuesta no disponible'}`;
    })
    .filter(Boolean)
    .join('\n');

  return formatted || '';
}

function buildSystemPrompt(businessName, settings = {}, lead = {}) {
  const services = formatServices(settings);
  const faq = formatFaq(settings);
  const leadContext = lead && lead.name
    ? `Cliente identificado: ${lead.name}`
    : 'Cliente aún no identificado';
  const notesContext = lead && lead.notes
    ? `Info capturada: ${lead.notes}`
    : '';

  return `Eres el asistente virtual de ${businessName}.

${leadContext}
${notesContext}

DESCRIPCIÓN DEL NEGOCIO:
${settings.business_description || ''}

SERVICIOS Y PRECIOS:
${services}

HORARIOS:
${settings.schedule || ''}

CONTACTO:
${settings.contact_info || ''}

PREGUNTAS FRECUENTES:
${faq}

INSTRUCCIONES ESPECIALES:
${settings.bot_instructions || ''}

REGLAS ESTRICTAS:
- Responde SIEMPRE en español en máximo 3 oraciones
- NUNCA inventes nombres de asesores o empleados
- NUNCA finjas ser humano
- Cuando el cliente quiera contacto humano di SOLO:
  "Un asesor te contactará en breve."
- Usa SOLO la información del contexto, nunca inventes datos
- Tu objetivo es capturar: nombre del cliente,
  nombre del negocio y datos de contacto
- Cuando tengas esos datos confirma y di que un asesor
  se contactará`;
}

function normalizeConversationMessages(conversationHistory) {
  if (!Array.isArray(conversationHistory)) return [];

  return conversationHistory
    .slice(-12)
    .map((message) => ({
      role: message.sender_type === 'customer' || message.direction === 'inbound' ? 'user' : 'assistant',
      content: message.message_text || message.body || ''
    }))
    .filter((message) => String(message.content || '').trim().length > 0);
}

function safeParseJson(content) {
  if (typeof content !== 'string') return null;

  const trimmed = content.trim();
  if (!trimmed) return null;

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fencedMatch ? fencedMatch[1].trim() : trimmed;

  try {
    return JSON.parse(jsonText);
  } catch (parseErr) {
    const objectMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!objectMatch) return null;

    try {
      return JSON.parse(objectMatch[0]);
    } catch (innerErr) {
      return null;
    }
  }
}

async function generateBotResponse(businessName, conversationHistory, userMessage, settings = {}, lead = {}) {
  const systemPrompt = buildSystemPrompt(businessName, settings, lead);

  const messages = normalizeConversationMessages(conversationHistory);
  const normalizedUserMessage = String(userMessage || '').trim();
  const lastMessage = messages[messages.length - 1] || null;

  if (
    normalizedUserMessage
    && (!lastMessage || lastMessage.role !== 'user' || String(lastMessage.content || '').trim() !== normalizedUserMessage)
  ) {
    messages.push({ role: 'user', content: normalizedUserMessage });
  }

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    max_tokens: 180,
    temperature: 0.4
  });

  return completion.choices[0]?.message?.content || null;
}

async function extractClientData(conversationHistory) {
  const messages = normalizeConversationMessages(conversationHistory);
  if (!messages.length) return null;

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      {
        role: 'system',
        content: 'Extrae datos del cliente desde la conversacion y devuelve SOLO un JSON valido con las claves client_name, business_name, contact e interest. Usa null cuando un dato no exista. No agregues texto extra.'
      },
      ...messages
    ],
    max_tokens: 120,
    temperature: 0
  });

  const content = completion.choices[0]?.message?.content || '';
  const parsed = safeParseJson(content);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const clientName = typeof parsed.client_name === 'string' ? parsed.client_name.trim() : '';
  const businessName = typeof parsed.business_name === 'string' ? parsed.business_name.trim() : '';
  const contact = typeof parsed.contact === 'string' ? parsed.contact.trim() : '';
  const interest = typeof parsed.interest === 'string' ? parsed.interest.trim() : '';

  if (!clientName && !businessName && !contact && !interest) {
    return null;
  }

  return {
    client_name: clientName || null,
    business_name: businessName || null,
    contact: contact || null,
    interest: interest || null
  };
}

module.exports = { buildSystemPrompt, generateBotResponse, extractClientData };