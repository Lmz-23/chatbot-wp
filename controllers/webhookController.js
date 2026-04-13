const webhookPipelineService = require('../services/webhook/eventPipelineService');

module.exports = {
  handleIncoming: webhookPipelineService.handleIncoming
};
