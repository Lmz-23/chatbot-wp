const migrateBusinessesIsActiveColumn = `
DO $$
BEGIN
  ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

  UPDATE businesses
  SET is_active = true
  WHERE is_active IS NULL;

  ALTER TABLE businesses
    ALTER COLUMN is_active SET DEFAULT true;

  ALTER TABLE businesses
    ALTER COLUMN is_active SET NOT NULL;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;`;

const migrateBusinessesContactColumns = `
DO $$
BEGIN
  ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

  ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS email VARCHAR(255);
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;`;

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

const migrateUsersIsActiveColumn = `
DO $$
BEGIN
  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

  UPDATE users
  SET is_active = true
  WHERE is_active IS DISTINCT FROM true;

  ALTER TABLE users
    ALTER COLUMN is_active SET DEFAULT true;

  ALTER TABLE users
    ALTER COLUMN is_active SET NOT NULL;
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;`;

module.exports = {
  migrateBusinessesIsActiveColumn,
  migrateBusinessesContactColumns,
  migrateConversationsCurrentNodeColumn,
  migrateConversationStatusConstraint,
  migrateLeadsTableSchema,
  migrateUsersIsActiveColumn
};
