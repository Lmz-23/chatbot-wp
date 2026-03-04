const logger = require('./logger');

/**
 * Helpers for webhook payload processing.
 * - extractEvents: normalize Facebook webhook payload into an array of events
 * - validateSignature: HMAC signature check (stub; requires raw body)
*/

// Normalize the webhook payload into a flat array of event objects.
// Facebook/WhatsApp sends an entry/changes structure; this helper unwraps it and
// hoists metadata (like phone_number_id) to the top-level for easier handling.
// Additional transformation (e.g. filtering statuses) can be added here.
function extractEvents(body) {
  try {
    const entries = body?.entry || [];
    const events = [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value || {};
        events.push({ ...change, metadata: value.metadata, value, ...value });
      }
    }
    return events;
  } catch (err) {
    logger.error('extract_events_failed', { err: err && err.message ? err.message : err });
    return [];
  }
}

// Validate the X-Hub-Signature header against the raw request body using
// the app secret. This prevents spoofed webhooks. Note that the caller needs
// to capture the raw body before Express parsers consume it.
function validateSignature(rawBody, signatureHeader, appSecret) {
  // signatureHeader example: 'sha1=...' or 'sha256=...'
  if (!rawBody || !signatureHeader || !appSecret) return false;
  try {
    const crypto = require('crypto');
    const [algorithm, signature] = signatureHeader.split('=');
    const hmac = crypto.createHmac(algorithm.replace('sha', 'sha'), appSecret);
    hmac.update(rawBody, 'utf8');
    const digest = hmac.digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(digest, 'hex'));
  } catch (err) {
    logger.error('signature_validation_error', { err: err && err.message ? err.message : err });
    return false;
  }
}

module.exports = { extractEvents, validateSignature };
