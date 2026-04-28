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
  migrateClinicFlowsToDefaultAdminTemplate,
  migratePrincipalBusinessToReplaiSalesFlow,
  resetEscalationConversationNodesToStart
} = require('./models/seedSql');

const {
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
  migratePrincipalBusinessToReplaiSalesFlow,
  resetEscalationConversationNodesToStart,
  defaultAdminBotFlowNodes
};
