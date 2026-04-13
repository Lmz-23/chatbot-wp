const {
  createUsersTable,
  createBusinessesTable,
  createWhatsappAccountsTable,
  createConversationsTable,
  createMessagesTable,
  createBlockedNumbersTable,
  createBotSettingsTable,
  createBusinessSettingsTable,
  createBotFlowsTable,
  createLeadsTable,
  createWhatsappOutboundTable,
  createIndexes
} = require('./models/schemaSql');

const {
  migrateBusinessesIsActiveColumn,
  migrateBusinessesContactColumns,
  migrateConversationsCurrentNodeColumn,
  migrateConversationStatusConstraint,
  migrateLeadsTableSchema,
  migrateUsersIsActiveColumn
} = require('./models/migrationSql');

const {
  seedDefaultClinicBotFlows,
  migrateClinicFlowsToDefaultAdminTemplate
} = require('./models/seedSql');

const {
  defaultClinicBotFlowNodes,
  defaultAdminBotFlowNodes
} = require('./models/flowDefaults');

module.exports = {
  createUsersTable,
  createBusinessesTable,
  createWhatsappAccountsTable,
  createConversationsTable,
  createMessagesTable,
  createBlockedNumbersTable,
  createBotSettingsTable,
  createBusinessSettingsTable,
  createBotFlowsTable,
  createLeadsTable,
  createWhatsappOutboundTable,
  createIndexes,
  migrateBusinessesIsActiveColumn,
  migrateBusinessesContactColumns,
  migrateConversationsCurrentNodeColumn,
  migrateConversationStatusConstraint,
  migrateLeadsTableSchema,
  migrateUsersIsActiveColumn,
  seedDefaultClinicBotFlows,
  migrateClinicFlowsToDefaultAdminTemplate,
  defaultClinicBotFlowNodes,
  defaultAdminBotFlowNodes
};
