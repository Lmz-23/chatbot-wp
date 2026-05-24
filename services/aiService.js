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

function parseNotesForPrompt(notes) {
  if (!notes) return '';

  let parsed = null;

  if (typeof notes === 'object' && !Array.isArray(notes)) {
    parsed = notes;
  } else if (typeof notes === 'string') {
    try {
      parsed = JSON.parse(notes);
    } catch {
      return String(notes).trim();
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return '';
  }

  const parts = [];
  const businessName = typeof parsed.business_name === 'string' ? parsed.business_name.trim() : '';
  const contact = typeof parsed.contact === 'string' ? parsed.contact.trim() : '';
  const interest = typeof parsed.interest === 'string' ? parsed.interest.trim() : '';

  if (businessName) parts.push(`Negocio: ${businessName}`);
  if (contact) parts.push(`Contacto: ${contact}`);
  if (interest) parts.push(`Interés: ${interest}`);

  if (parts.length) {
    return parts.join(' | ');
  }

  return String(notes).trim();
}

function buildSystemPrompt(businessName, settings = {}, lead = {}) {
  const services = formatServices(settings);
  const faq = formatFaq(settings);
  const assistantName = String(settings.assistant_name || 'el asistente virtual').trim() || 'el asistente virtual';
  const hasName = !!(lead && lead.name);
  const parsedNotes = parseNotesForPrompt(lead && lead.notes);
  const hasBusinessName = Boolean(parsedNotes && String(parsedNotes).includes('Negocio:'));
  const missingData = [];

  if (!hasName) missingData.push('nombre del cliente');
  if (!hasBusinessName) missingData.push('nombre de su negocio');

  const sections = [];

  sections.push(`Eres ${assistantName} de ${businessName}.`);
  sections.push('Tu estilo es cercano, directo y profesional. Como un buen vendedor: cálido sin ser informal, claro sin ser frío. Puedes usar máximo 1 emoji por mensaje cuando sea natural.');

  if (hasName) {
    sections.push(`El cliente se llama ${lead.name}. No vuelvas a pedirle su nombre.`);
  }

  if (hasBusinessName) {
    sections.push(`Su negocio es ${parsedNotes.replace(/^Negocio:\s*/i, '').split(' | ')[0]}. No vuelvas a preguntarlo.`);
  }

  if (missingData.length > 0) {
    sections.push('Obtén conversacionalmente: nombre del cliente y nombre de su negocio. Hazlo de forma natural, nunca como formulario.');
  }

  sections.push('SOBRE EL NEGOCIO:');
  sections.push(settings.business_description || '');

  sections.push('SERVICIOS:');
  sections.push(services);

  sections.push('HORARIOS:');
  sections.push(settings.schedule || '');

  sections.push('CONTACTO:');
  sections.push(settings.contact_info || '');

  if (faq) {
    sections.push('PREGUNTAS FRECUENTES:');
    sections.push(faq);
  }

  if (settings.bot_instructions && String(settings.bot_instructions).trim()) {
    sections.push('INSTRUCCIONES DEL NEGOCIO:');
    sections.push(settings.bot_instructions);
  }

  sections.push('REGLAS:');
  sections.push('- CRÍTICO: Máximo 2 oraciones por respuesta. Sin excepciones. Si tienes mucho que decir, prioriza lo más importante y deja el resto para el siguiente mensaje.');
  sections.push('- TONO: Prohibido usar frases como "me alegra", "gracias por compartir", "con gusto", "excelente pregunta" o cualquier frase de chatbot genérico. Habla como una persona real, directo al punto.');
  sections.push('- Cuando des precios, da el número directo sin rodeos. Ejemplo: "El Plan Básico son $75/mes. ¿Te interesa?"');
  sections.push('- Nunca inventes información del negocio');
  sections.push('- Nunca menciones que eres una IA o bot a menos que te lo pregunten directamente');
  sections.push('- Si el cliente pide hablar con una persona, responde: "Claro, en breve te contacta uno de nuestros asesores 👌"');
  sections.push('- Responde solo lo que te preguntan, no listes todos los servicios de golpe');
  sections.push('- Las instrucciones del negocio tienen prioridad sobre estas reglas generales');

  if (missingData.length > 0) {
    sections.push(`Aún te falta capturar: ${missingData.join(', ')}. Cuando los tengas todos, confirma y di que un asesor se contactará.`);
  }

  return sections.filter((section) => String(section || '').trim().length > 0).join('\n\n');
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