const { normalizePhone } = require('../../utils/phone');

async function sendMessageFlow({
  conversation,
  conversationId,
  businessId,
  text,
  conversationService,
  messageService,
  leadService,
  logger
}) {
  const business = {
    id: conversation.business_id,
    name: conversation.business_name,
    token: conversation.token,
    phone_number_id: conversation.phone_number_id
  };
  const normalizedPhone = normalizePhone(conversation.user_phone);

  await conversationService.markConversationActive(conversationId);

  try {
    await messageService.sendText({
      business,
      to: normalizedPhone,
      body: text.trim()
    });

    const savedMessage = await conversationService.saveMessage(
      conversationId,
      'outbound',
      text.trim(),
      'agent_sent'
    );

    const leadResult = await leadService.promoteLeadOnAgentMessage(businessId, normalizedPhone);
    logger.info('lead_promoted_on_agent_message', {
      conversationId,
      businessId,
      phone: normalizedPhone,
      leadUpdated: leadResult ? true : false,
      leadStatus: leadResult?.status
    });

    logger.info('message_sent_success', {
      conversationId,
      businessId,
      messageId: savedMessage.id
    });

    return {
      status: 200,
      body: {
        ok: true,
        message: savedMessage
      }
    };
  } catch (whatsappError) {
    logger.error('whatsapp_send_failed', {
      conversationId,
      businessId,
      err: whatsappError && whatsappError.message ? whatsappError.message : whatsappError
    });

    const failedMessage = await conversationService.saveMessage(
      conversationId,
      'outbound',
      text.trim(),
      'agent_failed'
    );

    return {
      status: 500,
      body: {
        error: 'whatsapp_send_failed',
        message: failedMessage,
        details: whatsappError && whatsappError.message ? whatsappError.message : 'Unknown error'
      }
    };
  }
}

module.exports = {
  sendMessageFlow
};
