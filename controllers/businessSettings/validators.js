const MAX_MESSAGE_LENGTH = 2000;
const MESSAGE_FIELDS = [
  'welcome_message',
  'pricing_message',
  'lead_capture_message',
  'fallback_message'
];

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function resolveBusinessScope(req) {
  const user = req.user || null;
  const tokenBusinessId = user && user.businessId ? user.businessId : null;
  const bodyBusinessId = req.body && (req.body.businessId || req.body.business_id)
    ? (req.body.businessId || req.body.business_id)
    : null;
  const queryBusinessId = req.query && typeof req.query.businessId === 'string'
    ? req.query.businessId.trim()
    : null;
  const requestedBusinessId = bodyBusinessId || queryBusinessId;

  if (user && user.platformRole === 'PLATFORM_ADMIN') {
    const scopedBusinessId = requestedBusinessId || tokenBusinessId;
    if (!scopedBusinessId) {
      return { error: { status: 400, body: { error: 'businessId is required for platform admin' } } };
    }

    if (!isUuid(scopedBusinessId)) {
      return { error: { status: 400, body: { error: 'businessId must be a valid UUID' } } };
    }

    return { businessId: scopedBusinessId };
  }

  if (!tokenBusinessId) {
    return { error: { status: 403, body: { error: 'forbidden' } } };
  }

  if (requestedBusinessId && requestedBusinessId !== tokenBusinessId) {
    return { error: { status: 403, body: { error: 'forbidden' } } };
  }

  if (!isUuid(tokenBusinessId)) {
    return { error: { status: 400, body: { error: 'businessId must be a valid UUID' } } };
  }

  return { businessId: tokenBusinessId };
}

async function validateBusinessExists(businessId, settingsService) {
  const exists = await settingsService.businessExists(businessId);
  if (!exists) {
    return { error: { status: 404, body: { error: 'business not found' } } };
  }

  return { ok: true };
}

function validateMessageFields(body) {
  for (const field of MESSAGE_FIELDS) {
    const value = body[field];
    if (value === undefined || value === null) continue;

    if (typeof value !== 'string') {
      return { error: { status: 400, body: { error: `${field} must be a string` } } };
    }

    if (value.length > MAX_MESSAGE_LENGTH) {
      return {
        error: {
          status: 400,
          body: { error: `${field} exceeds ${MAX_MESSAGE_LENGTH} characters` }
        }
      };
    }
  }

  return { ok: true };
}

function buildSettingsUpdates(body) {
  return {
    welcome_message: body.welcome_message,
    pricing_message: body.pricing_message,
    lead_capture_message: body.lead_capture_message,
    fallback_message: body.fallback_message
  };
}

module.exports = {
  buildSettingsUpdates,
  resolveBusinessScope,
  validateBusinessExists,
  validateMessageFields
};
