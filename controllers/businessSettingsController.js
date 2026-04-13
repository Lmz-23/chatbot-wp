const settingsService = require('../services/settingsService');
const logger = require('../utils/logger');
const { withAsyncHandler } = require('./asyncHandler');
const { createInternalErrorHandler } = require('./internalErrorHandler');
const {
  buildSettingsUpdates,
  resolveBusinessScope,
  validateBusinessExists,
  validateMessageFields
} = require('./businessSettings/validators');

// Validates and updates per-business chatbot messages and fallback copy.
const updateBusinessSettings = withAsyncHandler(async (req, res) => {
  const scope = resolveBusinessScope(req);
  if (scope.error) {
    return res.status(scope.error.status).json(scope.error.body);
  }

  const { businessId } = scope;

  const existsValidation = await validateBusinessExists(businessId, settingsService);
  if (existsValidation.error) {
    return res.status(existsValidation.error.status).json(existsValidation.error.body);
  }

  await settingsService.getOrCreateSettings(businessId);

  const messagesValidation = validateMessageFields(req.body);
  if (messagesValidation.error) {
    return res.status(messagesValidation.error.status).json(messagesValidation.error.body);
  }

  const updates = buildSettingsUpdates(req.body);

  const updated = await settingsService.updateSettings(businessId, updates);
  return res.status(200).json({ ok: true, settings: updated });
}, createInternalErrorHandler(logger, 'update_business_settings_failed'));

module.exports = { updateBusinessSettings };
