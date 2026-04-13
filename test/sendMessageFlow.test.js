const test = require('node:test');
const assert = require('node:assert/strict');

const { sendMessageFlow } = require('../controllers/conversation/sendMessageFlow');

function createLoggerSpy() {
  const logs = { info: [], error: [] };
  return {
    logs,
    info: (event, meta) => logs.info.push({ event, meta }),
    error: (event, meta) => logs.error.push({ event, meta })
  };
}

function createBaseContext() {
  const logger = createLoggerSpy();
  const calls = {
    markConversationActive: 0,
    sendText: 0,
    saveMessage: [],
    promoteLeadOnAgentMessage: 0
  };

  const conversationService = {
    markConversationActive: async () => {
      calls.markConversationActive += 1;
    },
    saveMessage: async (conversationId, direction, body, status) => {
      calls.saveMessage.push({ conversationId, direction, body, status });
      return { id: `msg-${status}`, status, body };
    }
  };

  const messageService = {
    sendText: async () => {
      calls.sendText += 1;
      return { messages: [{ id: 'wamid-1' }] };
    }
  };

  const leadService = {
    promoteLeadOnAgentMessage: async () => {
      calls.promoteLeadOnAgentMessage += 1;
      return { status: 'CONTACTED' };
    }
  };

  const conversation = {
    business_id: 'biz-1',
    business_name: 'Demo',
    token: 'token',
    phone_number_id: 'pnid-1',
    user_phone: '+52 55 1111 1111'
  };

  return {
    logger,
    calls,
    context: {
      conversation,
      conversationId: 'conv-1',
      businessId: 'biz-1',
      text: ' hola ',
      conversationService,
      messageService,
      leadService,
      logger
    }
  };
}

test('sendMessageFlow responde 200 y persiste agent_sent cuando WhatsApp envia', async () => {
  const { context, calls, logger } = createBaseContext();

  const response = await sendMessageFlow(context);

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.equal(calls.markConversationActive, 1);
  assert.equal(calls.sendText, 1);
  assert.equal(calls.promoteLeadOnAgentMessage, 1);
  assert.equal(calls.saveMessage.length, 1);
  assert.equal(calls.saveMessage[0].status, 'agent_sent');
  assert.equal(logger.logs.error.length, 0);
});

test('sendMessageFlow responde 500 y persiste agent_failed cuando WhatsApp falla', async () => {
  const { context, calls, logger } = createBaseContext();

  context.messageService.sendText = async () => {
    calls.sendText += 1;
    throw new Error('network_down');
  };

  const response = await sendMessageFlow(context);

  assert.equal(response.status, 500);
  assert.equal(response.body.error, 'whatsapp_send_failed');
  assert.equal(calls.markConversationActive, 1);
  assert.equal(calls.sendText, 1);
  assert.equal(calls.promoteLeadOnAgentMessage, 0);
  assert.equal(calls.saveMessage.length, 1);
  assert.equal(calls.saveMessage[0].status, 'agent_failed');
  assert.equal(logger.logs.error.length, 1);
  assert.equal(logger.logs.error[0].event, 'whatsapp_send_failed');
});
