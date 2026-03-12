const db = require('../db');

const DEFAULT_SETTINGS = {
  welcome_message: 'Hola! Soy tu asistente virtual. ¿Cómo puedo ayudarte hoy?',
  pricing_message: 'Con gusto. Nuestros precios dependen del servicio y volumen. Si quieres, te comparto una cotización rápida.',
  lead_capture_message: 'Perfecto, uno de nuestros asesores te contactará pronto. ¡Gracias por tu interés!',
  fallback_message: 'Gracias por tu mensaje. Ya reviso el contexto de la conversación y te ayudo enseguida.'
};

async function getSettingsByBusinessId(businessId) {
  if (!businessId) return null;

  const q = `
    SELECT *
    FROM business_settings
    WHERE business_id = $1
    LIMIT 1`;

  const result = await db.query(q, [businessId]);
  return result.rows[0] || null;
}

async function createDefaultSettings(businessId) {
  if (!businessId) {
    throw new Error('missing_business_id');
  }

  const q = `
    INSERT INTO business_settings (
      business_id,
      welcome_message,
      pricing_message,
      lead_capture_message,
      fallback_message
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (business_id) DO NOTHING`;

  await db.query(q, [
    businessId,
    DEFAULT_SETTINGS.welcome_message,
    DEFAULT_SETTINGS.pricing_message,
    DEFAULT_SETTINGS.lead_capture_message,
    DEFAULT_SETTINGS.fallback_message
  ]);
}

async function getOrCreateSettings(businessId) {
  if (!businessId) {
    throw new Error('missing_business_id');
  }

  await createDefaultSettings(businessId);
  const settings = await getSettingsByBusinessId(businessId);
  if (!settings) {
    throw new Error('settings_not_found_after_create');
  }
  return settings;
}

async function businessExists(businessId) {
  if (!businessId) return false;

  const q = `
    SELECT 1
    FROM businesses
    WHERE id = $1
    LIMIT 1`;

  const result = await db.query(q, [businessId]);
  return result.rows.length > 0;
}

async function updateSettings(businessId, updates = {}) {
  const q = `
    UPDATE business_settings
    SET
      welcome_message = COALESCE($2, welcome_message),
      pricing_message = COALESCE($3, pricing_message),
      lead_capture_message = COALESCE($4, lead_capture_message),
      fallback_message = COALESCE($5, fallback_message),
      updated_at = now()
    WHERE business_id = $1
    RETURNING *`;

  const result = await db.query(q, [
    businessId,
    updates.welcome_message ?? null,
    updates.pricing_message ?? null,
    updates.lead_capture_message ?? null,
    updates.fallback_message ?? null
  ]);

  return result.rows[0] || null;
}

module.exports = {
  DEFAULT_SETTINGS,
  getSettingsByBusinessId,
  createDefaultSettings,
  getOrCreateSettings,
  businessExists,
  updateSettings
};
