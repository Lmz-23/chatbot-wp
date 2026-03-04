require('dotenv').config();
const express = require('express');
const logger = require('./utils/logger');
const db = require('./db');

const app = express();
// parse JSON bodies (Webhook posts are application/json)
app.use(express.json());

// Mount routes
// - /webhook is the main entrypoint for WhatsApp events
// - /test-whatsapp is a temporary helper for sending test messages; it
//   should be removed or secured before production.
app.use('/webhook', require('./routes/webhook'));
app.use('/', require('./routes/test-whatsapp'));

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Initialize DB schema (idempotent). In production use proper migrations.
    // This placeholder creates tables on each start; replace with a
    // migration run via CLI or CI step.
    if (db.init) await db.init().catch((e) => logger.warn('db_init_warn', { err: e.message || e }));

    const server = app.listen(PORT, () => {
      logger.info('server_started', { port: PORT });
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('shutdown_signal_received');
      server.close(() => logger.info('http_server_closed'));
      if (db.pool && db.pool.end) await db.pool.end().catch(() => {});
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    process.on('unhandledRejection', (reason) =>
      logger.error('unhandled_rejection', { reason: reason && reason.message ? reason.message : reason })
    );
    process.on('uncaughtException', (err) =>
      logger.error('uncaught_exception', { err: err && err.message ? err.message : err })
    );
  } catch (err) {
    logger.error('startup_failed', { err: err && err.message ? err.message : err });
    process.exit(1);
  }
}

start();