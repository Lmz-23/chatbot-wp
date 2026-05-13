DELETE FROM messages
WHERE conversation_id IN (
  SELECT id FROM conversations
  WHERE user_phone LIKE '5215559000%'
);

DELETE FROM conversations
WHERE user_phone LIKE '5215559000%';

DELETE FROM leads
WHERE phone LIKE '5215559000%';
