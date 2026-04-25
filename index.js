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

function normalizeOrigin(origin) {
  return String(origin || '')
    .trim()
    .replace(/\/+$/, '');
}

function buildAllowedOrigins() {
  const raw = String(process.env.FRONTEND_URL || '');
  return new Set(
    raw
      .split(',')
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean)
  );
}

const allowedOrigins = buildAllowedOrigins();

// parse JSON bodies (Webhook posts are application/json)
app.use(
  express.json({
    verify: (req, res, buf) => {
      // Preserve the exact payload bytes to validate Meta webhook signature.
      req.rawBody = Buffer.from(buf);
    }
  })
);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const normalizedOrigin = normalizeOrigin(origin);
  const isAllowed = normalizedOrigin && allowedOrigins.has(normalizedOrigin);

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    if (origin && !isAllowed) {
      logger.warn('cors_origin_not_allowed', { origin });
      return res.status(403).json({ error: 'Origin no permitido' });
    }
    return res.status(200).end();
  }

  next();
});

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