const db = require('../db');

function normalizeNodes(nodes) {
  if (!Array.isArray(nodes)) {
    throw new Error('invalid_bot_flow_nodes');
  }

  return nodes;
}

async function getFlowByBusiness(businessId) {
  if (!businessId) return null;

  const q = `
    SELECT
      id,
      business_id,
      nodes,
      created_at,
      updated_at
    FROM bot_flows
    WHERE business_id = $1
    LIMIT 1`;

  const result = await db.query(q, [businessId]);
  return result.rows[0] || null;
}

async function saveFlow(businessId, nodes) {
  if (!businessId) {
    throw new Error('missing_business_id');
  }

  const normalizedNodes = normalizeNodes(nodes);

  const q = `
    INSERT INTO bot_flows (business_id, nodes, updated_at)
    VALUES ($1, $2::jsonb, now())
    ON CONFLICT (business_id)
    DO UPDATE SET
      nodes = EXCLUDED.nodes,
      updated_at = now()
    RETURNING
      id,
      business_id,
      nodes,
      created_at,
      updated_at`;

  const result = await db.query(q, [businessId, JSON.stringify(normalizedNodes)]);
  return result.rows[0] || null;
}

async function getNodeById(businessId, nodeId) {
  if (!businessId || !nodeId) return null;

  const flow = await getFlowByBusiness(businessId);
  if (!flow || !Array.isArray(flow.nodes)) return null;

  return flow.nodes.find((node) => node && node.id === nodeId) || null;
}

module.exports = {
  getFlowByBusiness,
  saveFlow,
  getNodeById
};