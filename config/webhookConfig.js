/**
 * Webhook configuration helpers.
 * KEEP SECRETS OUT OF SOURCE: use environment variables or secret manager.
 */

const GLOBAL_VERIFY_TOKEN = process.env.VERIFY_TOKEN;

function verifyToken(token, mode) {
  // For initial setup we use a global verify token. In multi-tenant setups,
  // you may implement per-tenant verify tokens stored securely in DB/Secrets.
  if (mode !== 'subscribe') return false;
  return token && GLOBAL_VERIFY_TOKEN && token === GLOBAL_VERIFY_TOKEN;
}

module.exports = { verifyToken };
