require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const db = require('./db');

const isProduction = process.env.NODE_ENV === 'production';
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'APP_SECRET', 'WHATSAPP_TOKEN'];
if (isProduction) {
  requiredEnvVars.push('FRONTEND_URL');
}
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL: Variable de entorno ${envVar} no esta definida`);
    process.exit(1);
  }
}

const app = express();

const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta mas tarde' },
  skip: (req) => req.method === 'GET' && req.path === '/webhook'
});

function buildAllowedOrigins() {
  if (isProduction) {
    return new Set(
      process.env.FRONTEND_URL
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    );
  }

  return new Set([
    'http://localhost:3000',
    'http://localhost:3001'
  ]);
}

const allowedOrigins = buildAllowedOrigins();

// Enable CORS for frontend development
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin || '';
  const isAllowed = requestOrigin && allowedOrigins.has(requestOrigin);

  if (requestOrigin && !isAllowed) {
    return res.status(403).json({ error: 'Origin no permitido' });
  }

  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// parse JSON bodies (Webhook posts are application/json)
app.use(
  express.json({
    verify: (req, res, buf) => {
      // Preserve the exact payload bytes to validate Meta webhook signature.
      req.rawBody = Buffer.from(buf);
    }
  })
);

app.use(globalRateLimiter);

// Mount routes
// - /webhook is the main entrypoint for WhatsApp events
app.use('/webhook', require('./routes/webhook'));
app.use('/auth', require('./routes/auth'));
app.use('/api', require('./routes/api-settings'));
app.use('/api', require('./routes/api-business-profile'));
app.use('/api', require('./routes/api-users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/admin/business', require('./routes/business-admin'));
app.use('/business', require('./routes/business-settings'));
app.use('/business', require('./routes/business-leads'));
app.use('/business', require('./routes/business-conversations'));
app.use('/business', require('./routes/business-stats'));

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