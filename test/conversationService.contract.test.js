const test = require('node:test');
const assert = require('node:assert/strict');

const conversationService = require('../services/conversationService');

test('conversationService mantiene contrato publico esperado', () => {
  assert.equal(typeof conversationService.resolveConversation, 'function');
  assert.equal(typeof conversationService.listConversationMessagesByBusiness, 'function');
  assert.equal(typeof conversationService.listBusinessConversations, 'function');
  assert.equal(typeof conversationService.getConversationWithBusiness, 'function');
  assert.equal(typeof conversationService.updateConversationStatusByBusiness, 'function');
  assert.equal(typeof conversationService.updateConversationCurrentNodeByBusiness, 'function');
  assert.equal(typeof conversationService.saveMessage, 'function');
  assert.equal(typeof conversationService.markConversationActive, 'function');
});
