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
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const createConversationsIndex = `
CREATE INDEX IF NOT EXISTS idx_conversations_account_user
  ON conversations (whatsapp_account_id, user_phone);`;

const createConversationsActiveIndex = `
CREATE INDEX IF NOT EXISTS idx_conversations_active_lookup
  ON conversations (whatsapp_account_id, user_phone, created_at DESC)
  WHERE status = 'active';`;

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
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  name TEXT,
  phone TEXT,
  interest TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const createLeadsBusinessIndex = `
CREATE INDEX IF NOT EXISTS idx_leads_business_id
  ON leads (business_id);`;

const createLeadsBusinessCreatedAtIndex = `
CREATE INDEX IF NOT EXISTS idx_leads_business_created_at
  ON leads (business_id, created_at);`;

const createLeadsConversationIndex = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_conversation_unique
  ON leads (conversation_id)
  WHERE conversation_id IS NOT NULL;`;

const createConversationsAccountCreatedAtIndex = `
CREATE INDEX IF NOT EXISTS idx_conversations_account_created_at
  ON conversations (whatsapp_account_id, created_at);`;

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
  createConversationsIndex,
  createConversationsActiveIndex,
  createMessagesTable,
  createMessagesConversationIndex,
  createMessagesConversationCreatedAtIndex,
  createLeadsTable,
  createLeadsBusinessIndex,
  createLeadsBusinessCreatedAtIndex,
  createLeadsConversationIndex,
  createConversationsAccountCreatedAtIndex,
  createBusinessSettingsTable,
  createUsersTable,
  createUsersEmailIndex,
  createMembershipsTable,
  createMembershipsUserIndex,
  createLogsTable
};
