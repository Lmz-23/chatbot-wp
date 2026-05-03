const settingsService = require('../services/settingsService');
const logger = require('../utils/logger');
const { withAsyncHandler } = require('./asyncHandler');
const { createInternalErrorHandler } = require('./internalErrorHandler');
const {
  resolveBusinessScope,
  validateBusinessExists
} = require('./businessSettings/validators');

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateObjectArray(value, itemValidator, fieldName) {
  if (value === undefined || value === null) {
    return { ok: true };
  }

  if (!Array.isArray(value)) {
    return { error: { status: 400, body: { error: `${fieldName} must be an array` } } };
  }

  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { error: { status: 400, body: { error: `${fieldName}[${index}] must be an object` } } };
    }

    const validation = itemValidator(item, index);
    if (validation.error) {
      return validation;
    }
  }

  return { ok: true };
}

function validateServicesArray(services) {
  return validateObjectArray(
    services,
    (item, index) => {
      if (!isNonEmptyString(item.name)) {
        return { error: { status: 400, body: { error: `services[${index}].name must be a string` } } };
      }
      if (!isNonEmptyString(item.description)) {
        return { error: { status: 400, body: { error: `services[${index}].description must be a string` } } };
      }
      if (!isNonEmptyString(item.price)) {
        return { error: { status: 400, body: { error: `services[${index}].price must be a string` } } };
      }
      return { ok: true };
    },
    'services'
  );
}

function validateFaqArray(faq) {
  return validateObjectArray(
    faq,
    (item, index) => {
      if (!isNonEmptyString(item.question)) {
        return { error: { status: 400, body: { error: `faq[${index}].question must be a string` } } };
      }
      if (!isNonEmptyString(item.answer)) {
        return { error: { status: 400, body: { error: `faq[${index}].answer must be a string` } } };
      }
      return { ok: true };
    },
    'faq'
  );
}

function buildContextUpdates(body) {
  return {
    business_description: body.business_description,
    services: body.services,
    schedule: body.schedule,
    contact_info: body.contact_info,
    bot_instructions: body.bot_instructions,
    faq: body.faq
  };
}

const getSettingsContext = withAsyncHandler(async (req, res) => {
  const scope = resolveBusinessScope(req);
  if (scope.error) {
    return res.status(scope.error.status).json(scope.error.body);
  }

  const { businessId } = scope;

  const existsValidation = await validateBusinessExists(businessId, settingsService);
  if (existsValidation.error) {
    return res.status(existsValidation.error.status).json(existsValidation.error.body);
  }

  const settings = await settingsService.getOrCreateSettings(businessId);
  return res.status(200).json({
    ok: true,
    context: {
      business_description: settings.business_description || '',
      services: Array.isArray(settings.services) ? settings.services : [],
      schedule: settings.schedule || '',
      contact_info: settings.contact_info || '',
      bot_instructions: settings.bot_instructions || '',
      faq: Array.isArray(settings.faq) ? settings.faq : []
    }
  });
}, createInternalErrorHandler(logger, 'get_settings_context_failed'));

const updateSettingsContext = withAsyncHandler(async (req, res) => {
  const scope = resolveBusinessScope(req);
  if (scope.error) {
    return res.status(scope.error.status).json(scope.error.body);
  }

  const { businessId } = scope;

  const existsValidation = await validateBusinessExists(businessId, settingsService);
  if (existsValidation.error) {
    return res.status(existsValidation.error.status).json(existsValidation.error.body);
  }

  const servicesValidation = validateServicesArray(req.body.services);
  if (servicesValidation.error) {
    return res.status(servicesValidation.error.status).json(servicesValidation.error.body);
  }

  const faqValidation = validateFaqArray(req.body.faq);
  if (faqValidation.error) {
    return res.status(faqValidation.error.status).json(faqValidation.error.body);
  }

  await settingsService.getOrCreateSettings(businessId);

  const updates = buildContextUpdates(req.body);
  const updated = await settingsService.updateSettings(businessId, updates);

  return res.status(200).json({
    ok: true,
    context: {
      business_description: updated.business_description || '',
      services: Array.isArray(updated.services) ? updated.services : [],
      schedule: updated.schedule || '',
      contact_info: updated.contact_info || '',
      bot_instructions: updated.bot_instructions || '',
      faq: Array.isArray(updated.faq) ? updated.faq : []
    }
  });
}, createInternalErrorHandler(logger, 'update_settings_context_failed'));

module.exports = {
  getSettingsContext,
  updateSettingsContext
};