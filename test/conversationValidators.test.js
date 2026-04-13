const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getBusinessIdFromRequest,
  parsePagination,
  validateBusinessScope,
  validateConversationId
} = require('../controllers/conversation/validators');

test('getBusinessIdFromRequest retorna businessId cuando existe', () => {
  const req = { user: { businessId: 'biz-1' } };
  assert.equal(getBusinessIdFromRequest(req), 'biz-1');
});

test('validateConversationId retorna error con UUID invalido', () => {
  const result = validateConversationId('123');
  assert.equal(result.status, 400);
  assert.equal(result.body.error, 'conversation id must be a valid UUID');
});

test('parsePagination aplica defaults y limites maximos', () => {
  const defaults = parsePagination(undefined, undefined);
  assert.equal(defaults.limit, 50);
  assert.equal(defaults.offset, 0);

  const capped = parsePagination('999', '3');
  assert.equal(capped.limit, 200);
  assert.equal(capped.offset, 3);
});

test('parsePagination retorna error en entradas invalidas', () => {
  const badLimit = parsePagination('0', '0');
  assert.equal(badLimit.error.status, 400);
  assert.equal(badLimit.error.body.error, 'limit must be a positive integer');

  const badOffset = parsePagination('10', '-1');
  assert.equal(badOffset.error.status, 400);
  assert.equal(badOffset.error.body.error, 'offset must be an integer >= 0');
});

test('validateBusinessScope valida forbidden, uuid y existencia', async () => {
  const settingsService = {
    businessExists: async (id) => id === '11111111-1111-4111-8111-111111111111'
  };

  const missing = await validateBusinessScope(null, settingsService);
  assert.equal(missing.status, 403);

  const invalid = await validateBusinessScope('abc', settingsService);
  assert.equal(invalid.status, 400);

  const notFound = await validateBusinessScope('11111111-1111-4111-8111-111111111112', settingsService);
  assert.equal(notFound.status, 404);

  const ok = await validateBusinessScope('11111111-1111-4111-8111-111111111111', settingsService);
  assert.equal(ok, null);
});
