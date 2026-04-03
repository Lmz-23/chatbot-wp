const db = require('../db');

async function getBusinessProfileById(businessId) {
  if (!businessId) return null;

  const q = `
    SELECT
      b.id,
      b.name,
      wa.phone_number_id,
      b.created_at
    FROM businesses b
    LEFT JOIN LATERAL (
      SELECT phone_number_id
      FROM whatsapp_accounts
      WHERE business_id = b.id
      ORDER BY created_at ASC
      LIMIT 1
    ) wa ON true
    WHERE b.id = $1
    LIMIT 1`;

  const result = await db.query(q, [businessId]);
  return result.rows[0] || null;
}

async function updateBusinessNameById(businessId, name) {
  if (!businessId) return null;

  const q = `
    UPDATE businesses
    SET name = $2
    WHERE id = $1
    RETURNING id, name, created_at`;

  const updated = await db.query(q, [businessId, name]);
  if (!updated.rows[0]) return null;

  return getBusinessProfileById(businessId);
}

module.exports = {
  getBusinessProfileById,
  updateBusinessNameById
};