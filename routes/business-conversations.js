const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { authenticateToken, requireBusinessRole } = require('../middlewares/auth');

// Conversation inbox and thread operations for business users.
router.get('/conversations', authenticateToken, requireBusinessRole(['OWNER', 'AGENT']), conversationController.listBusinessConversations);
router.get('/conversations/:id/messages', authenticateToken, requireBusinessRole(['OWNER', 'AGENT']), conversationController.getConversationMessages);
router.post('/conversations/:id/messages', authenticateToken, requireBusinessRole(['OWNER', 'AGENT']), conversationController.sendMessage);
router.patch('/conversations/:id/status', authenticateToken, requireBusinessRole(['OWNER', 'AGENT']), conversationController.updateConversationStatus);

module.exports = router;
