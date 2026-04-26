const {
  createUsersTable,
  createBusinessesTable,
  createBotFlowsTable,
  createBotFlowsBusinessIndex,
  createWhatsappAccountsTable,
  createConversationsTable,
  createConversationsIndex,
  createConversationsActiveIndex,
  createConversationsAccountCreatedAtIndex,
  createMessagesTable,
  createMessagesConversationIndex,
  createMessagesConversationCreatedAtIndex,
  createLeadsTable,
  createLeadsBusinessPhoneIndex,
  createLeadsBusinessStatusIndex,
  createLeadsBusinessInteractionIndex,
  createLeadsBusinessCreatedAtIndex,
  createMembershipsTable,
  createMembershipsUserIndex,
  createLogsTable,
  createBlockedNumbersTable,
  createBotSettingsTable,
  createBusinessSettingsTable,
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
  createBotFlowsTable,
  createBotFlowsBusinessIndex,
  createWhatsappAccountsTable,
  createConversationsTable,
  createConversationsIndex,
  createConversationsActiveIndex,
  createConversationsAccountCreatedAtIndex,
  createMessagesTable,
  createMessagesConversationIndex,
  createMessagesConversationCreatedAtIndex,
  createLeadsTable,
  createLeadsBusinessPhoneIndex,
  createLeadsBusinessStatusIndex,
  createLeadsBusinessInteractionIndex,
  createLeadsBusinessCreatedAtIndex,
  createMembershipsTable,
  createMembershipsUserIndex,
  createLogsTable,
  createBlockedNumbersTable,
  createBotSettingsTable,
  createBusinessSettingsTable,
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
