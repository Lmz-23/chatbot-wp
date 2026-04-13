const MESSAGE_SENDER_TYPE_CASE_SQL = `
CASE
  WHEN m.direction = 'inbound' THEN 'customer'
  WHEN m.direction = 'incoming' THEN 'customer'
  WHEN m.direction = 'outgoing' THEN 'agent'
  WHEN m.direction = 'outbound' AND m.status IN ('agent_sent', 'agent_failed') THEN 'agent'
  WHEN m.direction = 'outbound' THEN 'bot'
  WHEN m.from_number = c.user_phone THEN 'customer'
  WHEN m.to_number = c.user_phone THEN 'bot'
  ELSE 'unknown'
END`;

module.exports = {
  MESSAGE_SENDER_TYPE_CASE_SQL
};
