const readService = require('./conversation/readService');
const mutationService = require('./conversation/mutationService');

module.exports = {
  ...readService,
  ...mutationService
};
