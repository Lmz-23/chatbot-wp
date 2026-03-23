const createBusinessesTable = `
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);`;

const createWhatsappAccountsTable = `
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone_number_id TEXT UNIQUE NOT NULL,
  phone_number TEXT,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);`;

const createConversationsTable = `
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_account_id UUID NOT NULL REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  user_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'bot' CHECK (status IN ('bot', 'active', 'closed')),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const migrateConversationStatusConstraint = `
DO $$
DECLARE
  check_name text;
BEGIN
  SELECT con.conname INTO check_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'conversations'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LIMIT 1;

  IF check_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE conversations DROP CONSTRAINT %I', check_name);
  END IF;

  ALTER TABLE conversations
    ADD CONSTRAINT conversations_status_check
    CHECK (status IN ('bot', 'active', 'closed'));
END $$;`;

const createConversationsIndex = `
CREATE INDEX IF NOT EXISTS idx_conversations_account_user
  ON conversations (whatsapp_account_id, user_phone);`;

const createConversationsActiveIndex = `
CREATE INDEX IF NOT EXISTS idx_conversations_active_lookup
  ON conversations (whatsapp_account_id, user_phone, created_at DESC)
  WHERE status = 'active';`;

const createConversationsAccountCreatedAtIndex = `
CREATE INDEX IF NOT EXISTS idx_conversations_account_created_at
  ON conversations (whatsapp_account_id, created_at);`;

const createMessagesTable = `
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE,
  whatsapp_account_id UUID REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  from_number TEXT,
  to_number TEXT,
  body TEXT,
  direction TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);`;

const createMessagesConversationIndex = `
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON messages (conversation_id);`;

const createMessagesConversationCreatedAtIndex = `
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON messages (conversation_id, created_at);`;

const createLeadsTable = `
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, phone)
);`;

const migrateLeadsTableSchema = `
DO $$
DECLARE
  status_check_name text;
BEGIN
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS name TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;
  ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

  UPDATE leads
  SET phone = regexp_replace(COALESCE(phone, ''), '\\D', '', 'g')
  WHERE phone IS NOT NULL;

  UPDATE leads
  SET status = CASE UPPER(COALESCE(status, 'NEW'))
    WHEN 'NEW' THEN 'NEW'
    WHEN 'CONTACTED' THEN 'CONTACTED'
    WHEN 'QUALIFIED' THEN 'QUALIFIED'
    WHEN 'CLOSED' THEN 'CLOSED'
    ELSE 'NEW'
  END;

  UPDATE leads
  SET created_at = COALESCE(created_at, now()),
      updated_at = COALESCE(updated_at, created_at, now()),
      last_interaction_at = COALESCE(last_interaction_at, updated_at, created_at, now());

  DELETE FROM leads l
  USING (
    SELECT id
    FROM (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY business_id, phone
          ORDER BY last_interaction_at DESC NULLS LAST, updated_at DESC, created_at DESC, id DESC
        ) AS rn
      FROM leads
      WHERE phone IS NOT NULL AND phone <> ''
    ) ranked
    WHERE ranked.rn > 1
  ) dup
  WHERE l.id = dup.id;

  ALTER TABLE leads ALTER COLUMN phone SET NOT NULL;
  ALTER TABLE leads ALTER COLUMN status SET NOT NULL;
  ALTER TABLE leads ALTER COLUMN created_at SET NOT NULL;
  ALTER TABLE leads ALTER COLUMN updated_at SET NOT NULL;
  ALTER TABLE leads ALTER COLUMN last_interaction_at SET NOT NULL;

  ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'NEW';
  ALTER TABLE leads ALTER COLUMN created_at SET DEFAULT now();
  ALTER TABLE leads ALTER COLUMN updated_at SET DEFAULT now();
  ALTER TABLE leads ALTER COLUMN last_interaction_at SET DEFAULT now();

  SELECT con.conname INTO status_check_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE rel.relname = 'leads'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LIMIT 1;

  IF status_check_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE leads DROP CONSTRAINT %I', status_check_name);
  END IF;

  ALTER TABLE leads
    ADD CONSTRAINT leads_status_check
    CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED'));
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;`;

const createLeadsBusinessPhoneIndex = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_business_phone_unique
  ON leads (business_id, phone);`;

const createLeadsBusinessStatusIndex = `
CREATE INDEX IF NOT EXISTS idx_leads_business_status
  ON leads (business_id, status);`;

const createLeadsBusinessInteractionIndex = `
CREATE INDEX IF NOT EXISTS idx_leads_business_interaction
  ON leads (business_id, last_interaction_at DESC);`;

const createLeadsBusinessCreatedAtIndex = `
CREATE INDEX IF NOT EXISTS idx_leads_business_created_at
  ON leads (business_id, created_at DESC);`;

const createBusinessSettingsTable = `
CREATE TABLE IF NOT EXISTS business_settings (
  business_id UUID PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  welcome_message TEXT,
  pricing_message TEXT,
  lead_capture_message TEXT,
  fallback_message TEXT,
  ai_enabled BOOLEAN NOT NULL DEFAULT false,
  human_handoff BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const createUsersTable = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  platform_role TEXT NOT NULL DEFAULT 'USER'
    CHECK (platform_role IN ('PLATFORM_ADMIN', 'USER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const createUsersEmailIndex = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
  ON users (email);`;

const createMembershipsTable = `
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'AGENT'
    CHECK (role IN ('OWNER', 'AGENT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)
);`;

const createMembershipsUserIndex = `
CREATE INDEX IF NOT EXISTS idx_memberships_user_id
  ON memberships (user_id);`;

const createLogsTable = `
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  level TEXT,
  message TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);`;

module.exports = {
  createBusinessesTable,
  createWhatsappAccountsTable,
  createConversationsTable,
  migrateConversationStatusConstraint,
  createConversationsIndex,
  createConversationsActiveIndex,
  createConversationsAccountCreatedAtIndex,
  createMessagesTable,
  createMessagesConversationIndex,
  createMessagesConversationCreatedAtIndex,
  createLeadsTable,
  migrateLeadsTableSchema,
  createLeadsBusinessPhoneIndex,
  createLeadsBusinessStatusIndex,
  createLeadsBusinessInteractionIndex,
  createLeadsBusinessCreatedAtIndex,
  createBusinessSettingsTable,
  createUsersTable,
  createUsersEmailIndex,
  createMembershipsTable,
  createMembershipsUserIndex,
  createLogsTable
};
