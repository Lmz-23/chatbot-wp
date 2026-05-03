const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function generateBotResponse(businessName, conversationHistory, userMessage, flowContext) {
  const systemPrompt = `Eres el asistente virtual de ${businessName}.
Tu objetivo es ayudar a los clientes y guiarlos hacia una venta o
atención personalizada. Sé amable, conciso y profesional.
Contexto del flujo actual: ${flowContext}
Si el cliente pregunta algo que no puedes resolver, ofrécele
hablar con un asesor humano.
Responde siempre en español y en máximo 2-3 oraciones.
No inventes precios ni información específica del negocio
que no tengas en el contexto.`;

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