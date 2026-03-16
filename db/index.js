const { Pool } = require('pg');
const logger = require('../utils/logger');

function shouldUseSsl() {
  const url = process.env.DATABASE_URL || '';
  if (!url) return false;
  if (/localhost|127\.0\.0\.1/.test(url)) return false;
  if (/sslmode=disable/i.test(url)) return false;
  return true;
}

// create a connection pool to Postgres; pool settings (max, idleTimeout) can be
// configured via environment variables or provider defaults. Using a pool allows
// multiple concurrent queries and is reused across the app.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
  client_encoding: 'UTF8',
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL error', { err: err && err.message ? err.message : err });
});

// wrapper around pool.query that logs duration for observability.
// Eventually this could be extended with retry logic or a metrics library.
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.info('db_query', { text, duration });
  return res;
}

// initialize database schema if tables do not exist. In production,
// replace this with a proper migration framework; this function is only
// intended for development / early MVP.
async function init() {
  const models = require('./models');
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await query(models.createBusinessesTable);
      await query(models.createWhatsappAccountsTable);
      await query(models.createConversationsTable);
      await query(models.createConversationsIndex);
      await query(models.createConversationsActiveIndex);
      await query(models.createConversationsAccountCreatedAtIndex);
      await query(models.createMessagesTable);
      await query(models.createMessagesConversationIndex);
      await query(models.createMessagesConversationCreatedAtIndex);
      await query(models.createLeadsTable);
      await query(models.createLeadsBusinessIndex);
      await query(models.createLeadsBusinessCreatedAtIndex);
      await query(models.createLeadsConversationIndex);
      await query(models.createBusinessSettingsTable);
      await query(models.createUsersTable);
      await query(models.createUsersEmailIndex);
      await query(models.createMembershipsTable);
      await query(models.createMembershipsUserIndex);
      await query(models.createLogsTable);
      logger.info('db_initialized', { attempt });
      return;
    } catch (err) {
      const details = err && err.message ? err.message : err;
      logger.warn('db_init_attempt_failed', { attempt, maxAttempts, err: details });
      if (attempt === maxAttempts) throw err;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}

module.exports = { pool, query, init };
