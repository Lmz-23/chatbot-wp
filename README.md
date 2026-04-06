# Chatbot SaaS - WhatsApp Cloud API

Minimal, modular backend for a multi-tenant WhatsApp automation SaaS using Node.js, Express and PostgreSQL.

Key principles
- Multi-tenant: each business has its own token, phone_number_id and verify_token.
- Secrets never hardcoded: use environment variables or secret manager (Render secrets, AWS Secrets Manager, Vault).
- Observability & audit: structured logs (JSON), persisted events and messages.
- Resilience & scale: quick webhook ACK, background workers, deduplication, container-ready.

Project layout (important files)
- index.js — Server bootstrap, routes mounting, graceful shutdown.
- /routes/webhook.js — GET (verify) and POST (events) webhook endpoints.
- /routes/test-whatsapp.js — Temporary test route (uses env vars).
- /controllers/webhookController.js — Parse events, identify tenant, dedupe and delegate.
- /services/messageService.js — Encapsulates Graph API calls (axios), per-tenant token.
- /services/businessService.js — Tenant lookup (Postgres); production: integrate secret manager.
- /db/* — Postgres connection and SQL for Businesses, Messages, Logs (use migrations in prod).
- /utils/logger.js — Winston JSON logger.
- /utils/helpers.js — Payload parsing, signature validation (add X‑Hub signature check).
- /config/* — Deployment-specific configs (keep minimal).

Environment variables (example)
- PORT=3000
- FRONTEND_URL=https://tu-frontend.com (obligatoria en produccion; permite lista separada por comas)
- DATABASE_URL=postgres://...
- VERIFY_TOKEN=global_verify_token (use per-tenant verify in prod)
- WHATSAPP_TOKEN=dev_whatsapp_token (dev only; use secret manager in prod)
- PHONE_NUMBER_ID=dev_phone_number_id
- TEST_PHONE_NUMBER=+15551234567
Note: Never commit .env. Use platform secret storage for production.

Quick start (development)
1. Copy .env locally (do NOT commit).
2. npm install
3. npm start
4. Expose webhook URL to Meta or use ngrok for local testing.

Security & production checklist (short)
- Validate X-Hub-Signature header on incoming webhooks.
- Move tenant tokens to a secret manager; do not store plaintext tokens in repo.
- Use Redis for deduplication and caching (not in-memory sets) when running multiple instances.
- Use DB migrations (node-pg-migrate / Flyway) instead of runtime CREATE TABLE.
- Add rate-limiting, per-tenant quotas and circuit breakers for external calls.
- Enable TLS, encrypt DB at rest, and enforce least-privilege for DB credentials.
- Implement metrics (Prometheus/OpenTelemetry) and error tracking (Sentry).

Next recommended steps
- Add Redis and worker queue (BullMQ) for async processing.
- Implement per-tenant configuration UI and onboarding flow.
- Add CI (tests, lint) and Dockerfile + docker-compose for local dev.

License & contribution
- Internal project scaffold. Add LICENSE and contribution guidelines before external collaboration.

Reason for README update (concise): reflect multi-tenant security rules, never hardcode secrets, list structure and production checklist for next steps.