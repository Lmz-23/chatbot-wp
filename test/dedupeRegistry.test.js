const test = require('node:test');
const assert = require('node:assert/strict');

const { createDedupeRegistry } = require('../services/webhook/dedupeRegistry');

function createLoggerSpy() {
  const infoCalls = [];
  return {
    infoCalls,
    info: (event, meta) => {
      infoCalls.push({ event, meta });
    }
  };
}

test('dedupeRegistry bloquea duplicado en el mismo scope y permite en scopes distintos', async () => {
  const logger = createLoggerSpy();
  const registry = createDedupeRegistry({ logger, ttlMs: 50 });

  assert.equal(registry.register('scope-a', 'msg-1', { id: 1 }), true);
  assert.equal(registry.register('scope-a', 'msg-1', { id: 1 }), false);
  assert.equal(registry.register('scope-b', 'msg-1', { id: 2 }), true);

  assert.equal(logger.infoCalls.length, 1);
  assert.equal(logger.infoCalls[0].event, 'duplicate_message_ignored');
});

test('dedupeRegistry vuelve a permitir el mismo mensaje tras expirar TTL', async () => {
  const logger = createLoggerSpy();
  const registry = createDedupeRegistry({ logger, ttlMs: 10 });

  assert.equal(registry.register('scope-a', 'msg-2', { id: 1 }), true);
  assert.equal(registry.register('scope-a', 'msg-2', { id: 1 }), false);

  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(registry.register('scope-a', 'msg-2', { id: 1 }), true);
});
