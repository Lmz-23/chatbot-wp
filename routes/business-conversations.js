const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const { authenticateToken, requireBusinessRole } = require('../middlewares/auth');

router.get('/conversations', authenticateToken, requireBusinessRole(['OWNER', 'AGENT']), conversationController.listBusinessConversations);
router.get('/conversations/:id/messages', authenticateToken, requireBusinessRole(['OWNER', 'AGENT']), conversationController.getConversationMessages);

module.exports = router;
