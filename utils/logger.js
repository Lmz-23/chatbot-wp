const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'chatbot-saas' },
  transports: [
    new transports.Console()
    // Add file or remote transports in production (ELK/Datadog)
  ]
});

module.exports = logger;