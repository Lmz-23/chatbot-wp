const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canManageBotSettings,
  getScopedBusinessId,
  validateAccessAndScope,
  validateNodesPayload
} = require('../controllers/botSettings/validators');

test('canManageBotSettings permite PLATFORM_ADMIN y OWNER', () => {
  assert.equal(canManageBotSettings({ user: { platformRole: 'PLATFORM_ADMIN' } }), true);
  assert.equal(canManageBotSettings({ user: { businessRole: 'OWNER' } }), true);
  assert.equal(canManageBotSettings({ user: { businessRole: 'AGENT' } }), false);
  assert.equal(canManageBotSettings({}), false);
});

test('getScopedBusinessId prioriza query.businessId para PLATFORM_ADMIN', () => {
  const adminReq = {
    user: { platformRole: 'PLATFORM_ADMIN', businessId: 'biz-user' },
    query: { businessId: 'biz-query' }
  };
  assert.equal(getScopedBusinessId(adminReq), 'biz-query');

  const ownerReq = {
    user: { businessRole: 'OWNER', businessId: 'biz-owner' },
    query: { businessId: 'biz-query' }
  };
  assert.equal(getScopedBusinessId(ownerReq), 'biz-owner');
});

test('validateAccessAndScope retorna forbidden sin permisos o scope', () => {
  const noUser = validateAccessAndScope({ user: null, query: {} });
  assert.equal(noUser.error.status, 403);

  const noScope = validateAccessAndScope({ user: { platformRole: 'PLATFORM_ADMIN' }, query: {} });
  assert.equal(noScope.error.status, 403);
});

test('validateAccessAndScope retorna businessId cuando acceso es valido', () => {
  const result = validateAccessAndScope({
    user: { businessRole: 'OWNER', businessId: 'biz-1' },
    query: {}
  });

  assert.equal(result.businessId, 'biz-1');
});

test('validateNodesPayload valida arreglo nodes', () => {
  const invalid = validateNodesPayload({ nodes: 'bad' });
  assert.equal(invalid.error.status, 400);
  assert.equal(invalid.error.body.error, 'nodes must be an array');

  const valid = validateNodesPayload({ nodes: [] });
  assert.equal(Array.isArray(valid.nodes), true);
});
