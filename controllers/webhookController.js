const helpers = require('../utils/helpers');
const businessService = require('../services/businessService');
const messageService = require('../services/messageService');
const logger = require('../utils/logger');

// Simple in-memory dedupe; replace with Redis in production
const processed = new Map();
const DEDUPE_TTL_MS = 1000 * 60 * 5;

// core handler for webhook events. Performs several responsibilities:
// 1. normalize payload into events
// 2. determine which tenant the event belongs to (via phone_number_id)
// 3. filter out non-message events and messages from the tenant itself
// 4. simple in‑memory deduplication per tenant (replace with Redis)
// 5. send a response via messageService (extensible)
// TODO: move parts (dedupe, reply generation) into pluggable strategy modules
async function handleIncoming(payload) {
  const events = helpers.extractEvents(payload);
  if (!events.length) return;

  for (const ev of events) {
    const phoneNumberId = ev.metadata?.phone_number_id;
    if (!phoneNumberId) {
      logger.warn('event_missing_phone_number_id', { event: ev });
      continue;
    }

    const business = await businessService.getByPhoneNumberId(phoneNumberId);
    if (!business) {
      logger.warn('unknown_business', { phoneNumberId });
      continue;
    }

    const message = ev.messages?.[0];
    if (!message) continue;

    if (message.from === business.phone_number) {
      logger.info('ignored_own_message', { businessId: business.id, messageId: message.id });
      continue;
    }

    const seen = processed.get(business.id) || new Set();
    if (seen.has(message.id)) {
      logger.info('duplicate_message_ignored', { businessId: business.id, messageId: message.id });
      continue;
    }
    seen.add(message.id);
    processed.set(business.id, seen);
    setTimeout(() => {
      const s = processed.get(business.id);
      if (s) {
        s.delete(message.id);
        if (s.size === 0) processed.delete(business.id);
      }
    }, DEDUPE_TTL_MS);

    try {
      const incomingText = message.text?.body || '';
      const replyText = `Recibí tu mensaje: ${incomingText}`;
      await messageService.sendText({ business, to: message.from, body: replyText });
      logger.info('reply_sent', { businessId: business.id, messageId: message.id });
    } catch (err) {
      logger.error('reply_failed', { businessId: business.id, err: err && err.message ? err.message : err });
    }
  }
}

module.exports = { handleIncoming };
