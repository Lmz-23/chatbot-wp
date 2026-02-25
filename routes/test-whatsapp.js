const axios = require('axios');
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// Temporary route to send a WhatsApp test message via Graph API v25.0
router.post('/test-whatsapp', async (req, res) => {
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER; // set e.g. +15551234567

  // Validate required env vars (do NOT hardcode tokens/numbers)
  if (!PHONE_NUMBER_ID || !WHATSAPP_TOKEN || !TEST_PHONE_NUMBER) {
    logger.error('test_whatsapp_missing_env', {
      havePhoneNumberId: !!PHONE_NUMBER_ID,
      haveWhatsappToken: !!WHATSAPP_TOKEN,
      haveTestPhoneNumber: !!TEST_PHONE_NUMBER
    });
    return res.status(500).json({ error: 'Missing configuration for test route' });
  }

  const to = TEST_PHONE_NUMBER.startsWith('whatsapp:')
    ? TEST_PHONE_NUMBER
    : `whatsapp:${TEST_PHONE_NUMBER}`;

  const url = `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: 'Test message from Express server' }
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    logger.info('test_whatsapp_sent', { status: response.status });
    return res.status(response.status).json(response.data);
  } catch (error) {
    const details = error.response ? error.response.data : { message: error.message };
    logger.error('test_whatsapp_error', { details });
    const status = error.response ? error.response.status : 500;
    return res.status(status).json({ error: 'Failed to send test message', details });
  }
});

module.exports = router;