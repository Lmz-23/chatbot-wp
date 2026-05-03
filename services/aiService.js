const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function generateBotResponse(businessName, conversationHistory, userMessage, flowContext, businessContext = {}) {
  const systemPrompt = `Eres el asistente virtual de ${businessName}.
Tu objetivo es guiar al cliente hacia una venta o atención personalizada.
Sé amable, conciso y profesional. Responde siempre en español 
en máximo 2-3 oraciones.

Información del negocio:
${businessContext.description || ''}

Contexto de la conversación actual:
${flowContext}

Reglas importantes:
- No inventes precios ni información que no tengas en el contexto
- Si no puedes resolver algo, ofrece hablar con un asesor humano
- Mantén el tono del negocio: profesional pero cercano
- Si el cliente muestra interés en comprar, pídele su nombre 
  y datos de contacto`;

  const messages = [
    ...conversationHistory.slice(-6).map((message) => ({
      role: message.sender_type === 'customer' || message.direction === 'inbound' ? 'user' : 'assistant',
      content: message.message_text || message.body || ''
    })),
    { role: 'user', content: userMessage }
  ];

  const completion = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages
    ],
    max_tokens: 150,
    temperature: 0.7
  });

  return completion.choices[0]?.message?.content || null;
}

module.exports = { generateBotResponse };