const { defaultClinicBotFlowNodes, defaultAdminBotFlowNodes } = require('./flowDefaults');

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

const migrateClinicFlowsToDefaultAdminTemplate = `
DO $$
BEGIN
  UPDATE bot_flows bf
  SET
    nodes = '${JSON.stringify(defaultAdminBotFlowNodes)}'::jsonb,
    updated_at = now()
  FROM businesses b
  WHERE b.id = bf.business_id
    AND LOWER(COALESCE(b.name, '')) <> LOWER('Mi primer bot')
    AND NOT EXISTS (
      SELECT 1
      FROM whatsapp_accounts w
      INNER JOIN conversations c ON c.whatsapp_account_id = w.id
      WHERE w.business_id = b.id
    )
    AND (
      COALESCE(bf.nodes->0->>'message', '') = 'Hola, soy el asistente de Replai para la clínica. ¿Buscas una cita, precios, horarios o hablar con un agente?'
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(bf.nodes) node
        WHERE node->>'id' IN ('appointment_general', 'appointment_dental', 'ask_service_price')
      )
    );
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;`;

module.exports = {
  seedDefaultClinicBotFlows,
  migrateClinicFlowsToDefaultAdminTemplate
};
