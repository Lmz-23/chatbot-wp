const { Pool } = require('pg');
const logger = require('../utils/logger');

// create a connection pool to Postgres; pool settings (max, idleTimeout) can be
// configured via environment variables or provider defaults. Using a pool allows
// multiple concurrent queries and is reused across the app.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
  await query(models.createBusinessesTable);
  await query(models.createWhatsappAccountsTable);
  await query(models.createMessagesTable);
  await query(models.createLogsTable);
  logger.info('db_initialized');
}

module.exports = { pool, query, init };
