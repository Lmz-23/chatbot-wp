function getInitStatements(models) {
  return [
    models.createBusinessesTable,
    models.migrateBusinessesIsActiveColumn,
    models.migrateBusinessesContactColumns,
    models.createBotFlowsTable,
    models.createBotFlowsBusinessIndex,
    models.seedDefaultClinicBotFlows,
    models.createWhatsappAccountsTable,
    models.createConversationsTable,
    models.migrateClinicFlowsToDefaultAdminTemplate,
    models.migrateConversationsCurrentNodeColumn,
    models.migrateConversationStatusConstraint,
    models.createConversationsIndex,
    models.createConversationsActiveIndex,
    models.createConversationsAccountCreatedAtIndex,
    models.createMessagesTable,
    models.createMessagesConversationIndex,
    models.createMessagesConversationCreatedAtIndex,
    models.createLeadsTable,
    models.migrateLeadsTableSchema,
    models.createLeadsBusinessPhoneIndex,
    models.createLeadsBusinessStatusIndex,
    models.createLeadsBusinessInteractionIndex,
    models.createLeadsBusinessCreatedAtIndex,
    models.createBusinessSettingsTable,
    models.createUsersTable,
    models.migrateUsersIsActiveColumn,
    models.createUsersEmailIndex,
    models.createMembershipsTable,
    models.createMembershipsUserIndex,
    models.createLogsTable
  ];
}

module.exports = { getInitStatements };
