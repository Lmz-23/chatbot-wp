const resetEscalationConversationNodesToStart = `
DO $$
BEGIN
  UPDATE conversations
  SET current_node = 'start'
  WHERE current_node IN ('escalate_agent', 'escalate_urgent');
EXCEPTION WHEN undefined_table THEN
  NULL;
END $$;`;

module.exports = {
  resetEscalationConversationNodesToStart
};
