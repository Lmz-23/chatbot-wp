const test = require('node:test');
const assert = require('node:assert/strict');
const { createEventPipelineService } = require('../services/webhook/eventPipelineService');

function createLoggerSpy() {
  const logs = { info: [], warn: [], error: [] };
  return {
    logs,
    info: (event, meta) => logs.info.push({ event, meta }),
    warn: (event, meta) => logs.warn.push({ event, meta }),
    error: (event, meta) => logs.error.push({ event, meta })
  };
}

function createBaseDeps() {
  const dbCalls = [];
  const logger = createLoggerSpy();

  const deps = {
    helpers: {
      extractEvents: (payload) => payload.events || []
    },
    db: {
      query: async (sql, params) => {
        dbCalls.push({ sql, params });
        return { rows: [] };
      }
    },
    businessService: {
      getByPhoneNumberId: async () => ({
        id: 'biz-1',
        whatsapp_account_id: 'wa-1',
        phone_number: '5215512345678'
      })
    },
    messageService: {
      sendText: async () => ({ messages: [{ id: 'out-1' }] })
    },
    conversationService: {
      resolveConversation: async () => ({ id: 'conv-1', status: 'bot' }),
      updateConversationCurrentNodeByBusiness: async () => ({}),
      updateConversationStatusByBusiness: async () => ({})
    },
    contextService: {
      getConversationContext: async () => []
    },
    conversationEngine: {
      generateResponse: async () => ({
        shouldActivateConversation: false,
        shouldSendMessage: true,
        replyText: 'ok',
        usedFlow: true,
        nextNodeId: 'node-2'
      })
    },
    leadService: {
      upsertLeadFromIncomingMessage: async () => ({}),
      reopenLeadOnIncomingMessage: async () => null
    },
    normalizePhone: (phone) => String(phone).replace(/\D/g, ''),
    logger
  };

  return { deps, dbCalls, logger };
}

test('ignora mensaje duplicado por dedupe en el mismo scope', async () => {
  const { deps } = createBaseDeps();
  let resolveCalls = 0;
  let upsertCalls = 0;

  deps.conversationService.resolveConversation = async () => {
    resolveCalls += 1;
    return { id: 'conv-1', status: 'bot' };
  };
  deps.leadService.upsertLeadFromIncomingMessage = async () => {
    upsertCalls += 1;
  };

  const pipeline = createEventPipelineService(deps);
  const duplicateEvent = {
    metadata: { phone_number_id: 'pn-1' },
    messages: [{ id: 'msg-dup-1', from: '5215511111111', text: { body: 'hola' } }]
  };

  await pipeline.handleIncoming({ events: [duplicateEvent, duplicateEvent] });

  assert.equal(resolveCalls, 1);
  assert.equal(upsertCalls, 1);
});

test('procesa evento de status sin messages', async () => {
  const { deps, dbCalls } = createBaseDeps();
  const pipeline = createEventPipelineService(deps);

  await pipeline.handleIncoming({
    events: [{
      metadata: { phone_number_id: 'pn-1' },
      statuses: [{ id: 'wamid-status-1', status: 'delivered' }]
    }]
  });

  const updateCalls = dbCalls.filter((c) => c.sql.includes('UPDATE messages'));
  assert.equal(updateCalls.length, 1);
  assert.equal(updateCalls[0].params[0], 'delivered');
  assert.equal(updateCalls[0].params[1], 'wamid-status-1');
});

test('no responde bot cuando la conversacion esta activa', async () => {
  const { deps } = createBaseDeps();
  let sendCalls = 0;
  let contextCalls = 0;

  deps.conversationService.resolveConversation = async () => ({ id: 'conv-1', status: 'active' });
  deps.messageService.sendText = async () => {
    sendCalls += 1;
    return { messages: [{ id: 'out-1' }] };
  };
  deps.contextService.getConversationContext = async () => {
    contextCalls += 1;
    return [];
  };

  const pipeline = createEventPipelineService(deps);
  await pipeline.handleIncoming({
    events: [{
      metadata: { phone_number_id: 'pn-1' },
      messages: [{ id: 'msg-active-1', from: '5215511111111', text: { body: 'hola agente' } }]
    }]
  });

  assert.equal(contextCalls, 0);
  assert.equal(sendCalls, 0);
});

test('en modo bot envia respuesta y guarda inbound/outbound', async () => {
  const { deps, dbCalls } = createBaseDeps();
  let sendCalls = 0;

  deps.messageService.sendText = async () => {
    sendCalls += 1;
    return { messages: [{ id: 'out-1' }] };
  };

  const pipeline = createEventPipelineService(deps);
  await pipeline.handleIncoming({
    events: [{
      metadata: { phone_number_id: 'pn-1' },
      messages: [{ id: 'msg-bot-1', from: '5215511111111', text: { body: 'hola bot' } }]
    }]
  });

  const insertCalls = dbCalls.filter((c) => c.sql.includes('INSERT INTO messages'));
  assert.equal(sendCalls, 1);
  assert.equal(insertCalls.length, 2);
});
