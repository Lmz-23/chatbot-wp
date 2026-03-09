const db = require('../db');
const logger = require('../utils/logger');

/**
 * Retrieve tenant configuration by phone_number_id.
 * In production prefer storing tokens in a secret manager and caching results.
 */
// fetch tenant configuration from the database by the phone_number_id
// provided in the webhook payload. This is the primary multi-tenant lookup
// point. In development we allow an "env fallback" to avoid spins of the
// DB. Remove the fallback in production and secure tokens in a secret store.
async function getByPhoneNumberId(phoneNumberId) {
  try {
    // new schema: whatsapp_accounts holds individual numbers; join to businesses
    const q = `
      SELECT
        b.id,
        b.name,
        w.id AS whatsapp_account_id,
        w.phone_number_id,
        w.phone_number,
        w.token
      FROM whatsapp_accounts w
      JOIN businesses b ON b.id = w.business_id
      WHERE w.phone_number_id = $1
      LIMIT 1`;
    const { rows } = await db.query(q, [phoneNumberId]);
    if (rows.length) return rows[0];

    // Dev fallback remains unchanged for testing with a single env number
    if (process.env.PHONE_NUMBER_ID && process.env.PHONE_NUMBER_ID === phoneNumberId && process.env.WHATSAPP_TOKEN) {
      logger.warn('using_env_credentials_for_phone_number_id', { phoneNumberId });
      return {
        id: 'env-fallback',
        name: 'env-fallback',
        whatsapp_account_id: null,
        phone_number_id: process.env.PHONE_NUMBER_ID,
        phone_number: process.env.MY_WHATSAPP_NUMBER || null,
        token: process.env.WHATSAPP_TOKEN
      };
    }

    return null;
  } catch (err) {
    logger.error('business_lookup_failed', { phoneNumberId, err: err && err.message ? err.message : err });
    return null;
  }
}

module.exports = { getByPhoneNumberId };
