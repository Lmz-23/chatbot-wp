const createBusinessesTable = `
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);`;

const defaultClinicBotFlowNodes = [
  {
    id: 'start',
    message: 'Hola, soy el asistente de Replai para la clínica. ¿Buscas una cita, precios, horarios o hablar con un agente?',
    transitions: [
      { keywords: ['general', 'medicina', 'consulta general'], next: 'appointment_general' },
      { keywords: ['dental', 'dentista', 'odontologia', 'odonto', 'muela'], next: 'appointment_dental' },
      { keywords: ['precio', 'precios', 'costo', 'costos', 'tarifa', 'cotizacion'], next: 'ask_service_price' },
      { keywords: ['horario', 'horarios', 'hora', 'abierto', 'atencion'], next: 'hours_info' },
      { keywords: ['urgente', 'dolor', 'sangrado', 'emergencia'], next: 'escalate_urgent' },
      { keywords: ['agente', 'humano', 'asesor', 'persona'], next: 'escalate_agent' }
    ],
    default: 'ask_specialty'
  },
  {
    id: 'ask_specialty',
    message: '¿Qué tipo de atención necesitas? Puedo ayudarte con medicina general o con odontología.',
    transitions: [
      { keywords: ['general', 'medicina', 'consulta'], next: 'appointment_general' },
      { keywords: ['dental', 'dentista', 'odontologia', 'muela'], next: 'appointment_dental' },
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' },
      { keywords: ['horario', 'hora', 'abierto'], next: 'hours_info' },
      { keywords: ['urgente', 'dolor', 'emergencia'], next: 'escalate_urgent' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' }
    ],
    default: 'fallback'
  },
  {
    id: 'appointment_general',
    message: 'Perfecto, te ayudo con una cita de medicina general. Compárteme tu nombre y número de teléfono para continuar.',
    transitions: [
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' },
      { keywords: ['horario', 'hora', 'abierto'], next: 'hours_info' },
      { keywords: ['urgente', 'dolor', 'emergencia'], next: 'escalate_urgent' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' }
    ],
    default: 'capture_data'
  },
  {
    id: 'appointment_dental',
    message: 'Perfecto, te ayudo con una cita de odontología. Compárteme tu nombre y número de teléfono para continuar.',
    transitions: [
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' },
      { keywords: ['horario', 'hora', 'abierto'], next: 'hours_info' },
      { keywords: ['urgente', 'dolor', 'emergencia'], next: 'escalate_urgent' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' }
    ],
    default: 'capture_data'
  },
  {
    id: 'ask_service_price',
    message: 'Claro. ¿Deseas el precio de medicina general o de odontología?',
    transitions: [
      { keywords: ['general', 'medicina'], next: 'price_general' },
      { keywords: ['dental', 'dentista', 'odontologia'], next: 'price_general' },
      { keywords: ['agendar', 'cita', 'reservar'], next: 'capture_data' },
      { keywords: ['horario', 'hora', 'abierto'], next: 'hours_info' }
    ],
    default: 'price_general'
  },
  {
    id: 'price_general',
    message: 'El precio puede variar según el servicio y la valoración. Si quieres, puedo ayudarte a agendar o enviarte con un agente.',
    transitions: [
      { keywords: ['agendar', 'cita', 'reservar'], next: 'capture_data' },
      { keywords: ['horario', 'hora', 'abierto'], next: 'hours_info' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' }
    ],
    default: 'capture_data'
  },
  {
    id: 'hours_info',
    message: 'Atendemos de lunes a viernes de 8:00 a 18:00 y sábados de 8:00 a 14:00.',
    transitions: [
      { keywords: ['agendar', 'cita', 'reservar'], next: 'capture_data' },
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' }
    ],
    default: 'fallback'
  },
  {
    id: 'capture_data',
    message: 'Perfecto. Envíame tu nombre completo y tu número de teléfono para confirmar la cita.',
    transitions: [
      { keywords: ['urgente', 'dolor', 'emergencia'], next: 'escalate_urgent' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' },
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' }
    ],
    default: 'escalate_agent'
  },
  {
    id: 'escalate_urgent',
    message: 'Si se trata de una urgencia, acude al servicio de emergencias más cercano o espera la atención de un agente.',
    transitions: [
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' },
      { keywords: ['cita', 'agendar'], next: 'capture_data' }
    ],
    default: 'escalate_agent'
  },
  {
    id: 'escalate_agent',
    message: 'Te conecto con un agente. En breve te atenderemos.',
    transitions: [
      { keywords: ['cita', 'agendar', 'reservar'], next: 'capture_data' },
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' }
    ],
    default: 'fallback'
  },
  {
    id: 'fallback',
    message: 'No te entendí del todo. Puedo ayudarte con citas, precios, horarios o con un agente.',
    transitions: [
      { keywords: ['general', 'medicina'], next: 'appointment_general' },
      { keywords: ['dental', 'dentista', 'odontologia'], next: 'appointment_dental' },
      { keywords: ['precio', 'costo', 'tarifa'], next: 'ask_service_price' },
      { keywords: ['horario', 'hora', 'abierto'], next: 'hours_info' },
      { keywords: ['agente', 'humano', 'asesor'], next: 'escalate_agent' }
    ],
    default: 'start'
  }
];

const createBotFlowsTable = `
CREATE TABLE IF NOT EXISTS bot_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  nodes JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);`;

const createBotFlowsBusinessIndex = `
CREATE UNIQUE INDEX IF NOT EXISTS idx_bot_flows_business_id_unique
  ON bot_flows (business_id);`;

const migrateConversationsCurrentNodeColumn = `
DO $$
BEGIN
  ALTER TABLE conversations
    ADD COLUMN IF NOT EXISTS current_node VARCHAR(50) DEFAULT 'start';

  UPDATE conversations
  SET current_node = COALESCE(current_node, 'start');

  ALTER TABLE conversations
    ALTER COLUMN current_node SET DEFAULT 'start';
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;`;

const seedDefaultClinicBotFlows = `
INSERT INTO bot_flows (business_id, nodes)
SELECT b.id, '${JSON.stringify(defaultClinicBotFlowNodes)}'::jsonb
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1
  FROM bot_flows bf
  WHERE bf.business_id = b.id
)
ON CONFLICT (business_id) DO NOTHING;`;

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
  current_node VARCHAR(50) DEFAULT 'start',
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
  defaultClinicBotFlowNodes,
  createBotFlowsTable,
  createBotFlowsBusinessIndex,
  migrateConversationsCurrentNodeColumn,
  seedDefaultClinicBotFlows,
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
