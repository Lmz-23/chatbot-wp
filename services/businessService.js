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
    const q = 'SELECT id, name, phone_number_id, phone_number, token FROM businesses WHERE phone_number_id = $1 LIMIT 1';
    const { rows } = await db.query(q, [phoneNumberId]);
    if (rows.length) return rows[0];

    // Dev fallback: use env credentials when phone_number_id matches
    if (process.env.PHONE_NUMBER_ID && process.env.PHONE_NUMBER_ID === phoneNumberId && process.env.WHATSAPP_TOKEN) {
      logger.warn('using_env_credentials_for_phone_number_id', { phoneNumberId });
      return {
        id: 'env-fallback',
        name: 'env-fallback',
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
