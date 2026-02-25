const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Send text message using tenant's token and phone_number_id.
 * Returns Graph API response object. Throws on failure.
 */
async function sendText({ business, to, body }) {
  if (!business || !business.token || !business.phone_number_id) {
    throw new Error('missing_business_credentials');
  }

  const url = `https://graph.facebook.com/v25.0/${business.phone_number_id}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
    type: 'text',
    text: { body }
  };

  try {
    const resp = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${business.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    logger.info('whatsapp_send_success', { businessId: business.id, status: resp.status });
    return resp.data;
  } catch (error) {
    const details = error.response ? error.response.data : { message: error.message };
    logger.error('whatsapp_send_error', { businessId: business.id, details });
    throw error;
  }
}

module.exports = { sendText };
