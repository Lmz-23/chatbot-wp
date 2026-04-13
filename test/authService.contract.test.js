const test = require('node:test');
const assert = require('node:assert/strict');

const authService = require('../services/authService');

test('authService mantiene contrato publico esperado', () => {
  assert.equal(typeof authService.login, 'function');
  assert.equal(typeof authService.generateToken, 'function');
  assert.equal(typeof authService.verifyToken, 'function');
  assert.equal(typeof authService.register, 'function');
});
