const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSettingsUpdates,
  resolveBusinessScope,
  validateBusinessExists,
  validateMessageFields
} = require('../controllers/businessSettings/validators');

test('resolveBusinessScope valida forbidden y UUID', () => {
  const missing = resolveBusinessScope({ user: null, body: {} });
  assert.equal(missing.error.status, 403);

  const mismatch = resolveBusinessScope({
    user: { businessId: '11111111-1111-4111-8111-111111111111' },
    body: { businessId: '11111111-1111-4111-8111-111111111112' }
  });
  assert.equal(mismatch.error.status, 403);

  const invalid = resolveBusinessScope({ user: { businessId: 'abc' }, body: {} });
  assert.equal(invalid.error.status, 400);
});

test('resolveBusinessScope retorna businessId valido', () => {
  const result = resolveBusinessScope({
    user: { businessId: '11111111-1111-4111-8111-111111111111' },
    body: {}
  });

  assert.equal(result.businessId, '11111111-1111-4111-8111-111111111111');
});

test('validateBusinessExists retorna 404 cuando negocio no existe', async () => {
  const settingsService = { businessExists: async () => false };
  const result = await validateBusinessExists('biz-1', settingsService);
  assert.equal(result.error.status, 404);
  assert.equal(result.error.body.error, 'business not found');
});

test('validateMessageFields valida tipo y longitud', () => {
  const invalidType = validateMessageFields({ welcome_message: 123 });
  assert.equal(invalidType.error.status, 400);
  assert.equal(invalidType.error.body.error, 'welcome_message must be a string');

  const tooLong = validateMessageFields({ welcome_message: 'x'.repeat(2001) });
  assert.equal(tooLong.error.status, 400);
  assert.equal(tooLong.error.body.error, 'welcome_message exceeds 2000 characters');

  const ok = validateMessageFields({ welcome_message: 'hola' });
  assert.equal(ok.ok, true);
});

test('buildSettingsUpdates arma payload esperado', () => {
  const updates = buildSettingsUpdates({
    welcome_message: 'a',
    pricing_message: 'b',
    lead_capture_message: 'c',
    fallback_message: 'd'
  });

  assert.deepEqual(updates, {
    welcome_message: 'a',
    pricing_message: 'b',
    lead_capture_message: 'c',
    fallback_message: 'd'
  });
});
