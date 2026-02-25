const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL error', { err: err && err.message ? err.message : err });
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.info('db_query', { text, duration });
  return res;
}

async function init() {
  const models = require('./models');
  await query(models.createBusinessesTable);
  await query(models.createMessagesTable);
  await query(models.createLogsTable);
  logger.info('db_initialized');
}

module.exports = { pool, query, init };
