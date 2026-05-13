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
  createUsersEmailIndex,
  createWhatsappOutboundTable,
  createIndexes
} = require('./models/schemaSql');

const {
  migrateBusinessesIsActiveColumn,
  migrateBusinessesContactColumns,
  migrateBusinessSettingsContextColumns,
  migrateConversationsCurrentNodeColumn,
  migrateConversationStatusConstraint,
  migrateLeadsTableSchema,
  migrateUsersIsActiveColumn
} = require('./models/migrationSql');

const {
  resetEscalationConversationNodesToStart
} = require('./models/seedSql');

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
  createUsersEmailIndex,
  createWhatsappOutboundTable,
  createIndexes,
  migrateBusinessesIsActiveColumn,
  migrateBusinessesContactColumns,
  migrateBusinessSettingsContextColumns,
  migrateConversationsCurrentNodeColumn,
  migrateConversationStatusConstraint,
  migrateLeadsTableSchema,
  migrateUsersIsActiveColumn,
  resetEscalationConversationNodesToStart
};
