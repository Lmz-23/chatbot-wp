const {
  defaultClinicBotFlowNodes,
  defaultAdminBotFlowNodes,
  defaultReplaiSalesBotFlowNodes
} = require('./flowDefaults');

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

const migratePrincipalBusinessToReplaiSalesFlow = `
DO $$
DECLARE
  target_business_id uuid;
BEGIN
  -- Select only one target business: prefer exact name match, otherwise one with WhatsApp connected.
  SELECT b.id
  INTO target_business_id
  FROM businesses b
  WHERE LOWER(COALESCE(b.name, '')) = LOWER('Mi primer bot')
     OR EXISTS (
       SELECT 1
       FROM whatsapp_accounts w
       WHERE w.business_id = b.id
     )
  ORDER BY
    CASE WHEN LOWER(COALESCE(b.name, '')) = LOWER('Mi primer bot') THEN 0 ELSE 1 END,
    b.created_at ASC
  LIMIT 1;

  IF target_business_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO bot_flows (business_id, nodes, updated_at)
  VALUES (
    target_business_id,
    '${JSON.stringify(defaultReplaiSalesBotFlowNodes)}'::jsonb,
    now()
  )
  ON CONFLICT (business_id)
  DO UPDATE SET
    nodes = EXCLUDED.nodes,
    updated_at = now();

  UPDATE businesses
  SET name = 'Replai'
  WHERE id = target_business_id
    AND COALESCE(name, '') <> 'Replai';
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;`;

module.exports = {
  seedDefaultClinicBotFlows,
  migrateClinicFlowsToDefaultAdminTemplate,
  migratePrincipalBusinessToReplaiSalesFlow
};
