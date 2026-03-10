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

const createLeadsTable = `
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  name TEXT,
  phone TEXT,
  interest TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`;

const createLeadsBusinessIndex = `
CREATE INDEX IF NOT EXISTS idx_leads_business_id
  ON leads (business_id);`;

const createLeadsConversationIndex = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_conversation_unique
  ON leads (conversation_id)
  WHERE conversation_id IS NOT NULL;`;

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
  createLeadsTable,
  createLeadsBusinessIndex,
  createLeadsConversationIndex,
  createBusinessSettingsTable,
  createLogsTable
};
