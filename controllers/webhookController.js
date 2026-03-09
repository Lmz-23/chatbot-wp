const helpers = require('../utils/helpers');
const db = require('../db');
const businessService = require('../services/businessService');
const messageService = require('../services/messageService');
const logger = require('../utils/logger');

// Simple in-memory dedupe; replace with Redis in production
const processed = new Map();
const DEDUPE_TTL_MS = 1000 * 60 * 5;

async function saveMessage({ messageId, whatsappAccountId, fromNumber, toNumber, body, direction, status }) {
  if (!whatsappAccountId) return;

  const q = `
    INSERT INTO messages (
      message_id,
      whatsapp_account_id,
      from_number,
      to_number,
      body,
      direction,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    -- Meta can retry webhook deliveries; keep writes idempotent by message_id.
    ON CONFLICT (message_id) DO NOTHING`;

  await db.query(q, [
    messageId || null,
    whatsappAccountId,
    fromNumber || null,
    toNumber || null,
    body || null,
    direction || null,
    status || null
  ]);
}

async function updateMessageStatus({ messageId, status }) {
  if (!messageId || !status) return;

  const q = `
    UPDATE messages
    SET status = $1
    WHERE message_id = $2`;

  await db.query(q, [status, messageId]);
}

// core handler for webhook events. Performs several responsibilities:
// 1. normalize payload into events
// 2. determine which tenant the event belongs to (via phone_number_id)
// 3. filter out non-message events and messages from the tenant itself
// 4. simple in-memory dedupe per WhatsApp account (replace with Redis)
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

    const statusEvent = ev.statuses?.[0];
    if (statusEvent?.id && statusEvent?.status) {
      try {
        await updateMessageStatus({ messageId: statusEvent.id, status: statusEvent.status });
        logger.info('message_status_updated', {
          businessId: business.id,
          messageId: statusEvent.id,
          status: statusEvent.status
        });
      } catch (err) {
        logger.error('message_status_update_failed', {
          businessId: business.id,
          messageId: statusEvent.id,
          status: statusEvent.status,
          err: err && err.message ? err.message : err
        });
      }
    }

    const message = ev.messages?.[0];
    if (!message) continue;

    if (message.from === business.phone_number) {
      logger.info('ignored_own_message', { businessId: business.id, messageId: message.id });
      continue;
    }

    // Deduplication scope is the WhatsApp account, not only business, so one
    // business can safely operate multiple numbers without cross-number clashes.
    const dedupeScope = business.whatsapp_account_id || business.id;
    const seen = processed.get(dedupeScope) || new Set();
    if (seen.has(message.id)) {
      logger.info('duplicate_message_ignored', {
        businessId: business.id,
        whatsappAccountId: business.whatsapp_account_id || null,
        messageId: message.id
      });
      continue;
    }
    seen.add(message.id);
    processed.set(dedupeScope, seen);
    setTimeout(() => {
      const s = processed.get(dedupeScope);
      if (s) {
        s.delete(message.id);
        if (s.size === 0) processed.delete(dedupeScope);
      }
    }, DEDUPE_TTL_MS);

    try {
      const incomingText = message.text?.body || '';
      await saveMessage({
        messageId: message.id,
        whatsappAccountId: business.whatsapp_account_id,
        fromNumber: message.from,
        toNumber: business.phone_number,
        body: incomingText,
        direction: 'inbound',
        status: 'received'
      });

      const replyText = `Recibí tu mensaje: ${incomingText}`;
      const sendResult = await messageService.sendText({ business, to: message.from, body: replyText });

      const outboundMessageId = sendResult?.messages?.[0]?.id || null;
      await saveMessage({
        messageId: outboundMessageId,
        whatsappAccountId: business.whatsapp_account_id,
        fromNumber: business.phone_number,
        toNumber: message.from,
        body: replyText,
        direction: 'outbound',
        status: 'sent'
      });

      logger.info('reply_sent', { businessId: business.id, messageId: message.id });
    } catch (err) {
      logger.error('reply_failed', { businessId: business.id, err: err && err.message ? err.message : err });
    }
  }
}

module.exports = { handleIncoming };
