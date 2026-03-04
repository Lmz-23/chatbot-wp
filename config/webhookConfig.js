/**
 * Webhook configuration helpers.
 * KEEP SECRETS OUT OF SOURCE: use environment variables or secret manager.
 */

const GLOBAL_VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Verify the token provided by Meta when establishing or re-validating a
// webhook subscription. In a SaaS environment you might need a per-tenant
// verify token (stored with the tenant record) rather than a single global
// value. The `mode` must be "subscribe" as per Facebook docs.
function verifyToken(token, mode) {
  if (mode !== 'subscribe') return false;
  return token && GLOBAL_VERIFY_TOKEN && token === GLOBAL_VERIFY_TOKEN;
}

module.exports = { verifyToken };
