function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getBusinessIdFromRequest(req) {
  return req.user && req.user.businessId;
}

async function validateBusinessScope(businessId, settingsService) {
  if (!businessId) {
    return { status: 403, body: { error: 'forbidden' } };
  }

  if (!isUuid(businessId)) {
    return { status: 400, body: { error: 'businessId must be a valid UUID' } };
  }

  const exists = await settingsService.businessExists(businessId);
  if (!exists) {
    return { status: 404, body: { error: 'business not found' } };
  }

  return null;
}

function validateConversationId(conversationId) {
  if (!isUuid(conversationId)) {
    return { status: 400, body: { error: 'conversation id must be a valid UUID' } };
  }

  return null;
}

function parsePagination(limitRaw, offsetRaw) {
  let limit = 50;
  let offset = 0;

  if (limitRaw !== undefined) {
    const parsedLimit = Number.parseInt(limitRaw, 10);
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      return {
        error: { status: 400, body: { error: 'limit must be a positive integer' } }
      };
    }
    limit = Math.min(parsedLimit, 200);
  }

  if (offsetRaw !== undefined) {
    const parsedOffset = Number.parseInt(offsetRaw, 10);
    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      return {
        error: { status: 400, body: { error: 'offset must be an integer >= 0' } }
      };
    }
    offset = parsedOffset;
  }

  return { limit, offset };
}

module.exports = {
  getBusinessIdFromRequest,
  parsePagination,
  validateBusinessScope,
  validateConversationId
};
