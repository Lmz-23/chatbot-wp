const axios = require('axios');
const express = require('express');
const router = express.Router();

// Ruta temporal para probar envío de mensaje WhatsApp
router.post('/test-whatsapp', async (req, res) => {
    // Obtener configuración desde variables de entorno
    const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;

    // Número de prueba en formato "whatsapp:+<country><number>"
    const to = 'whatsapp:+15551405868'; // reemplazar por el número de prueba

    // Validar configuración
    if (!PHONE_NUMBER_ID || !WHATSAPP_TOKEN) {
        console.error('Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID in environment');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // Endpoint de la Graph API v25.0 para enviar mensajes
    const url = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;

    // Cuerpo del request conforme al API de WhatsApp Cloud
    const payload = {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: 'Test message from Express server' }
    };

    try {
        // Llamada POST con encabezados, incluyendo el token Bearer
        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        // Devolver la respuesta de la Graph API al cliente
        return res.status(response.status).json(response.data);
    } catch (error) {
        // Loguear detalles del error para diagnóstico
        console.error('WhatsApp Graph API error:', error.response ? error.response.data : error.message);

        // Responder con el estado y detalles del error cuando estén disponibles
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({
            error: 'Failed to send WhatsApp message',
            details: error.response ? error.response.data : error.message
        });
    }
});

module.exports = router;