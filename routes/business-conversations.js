const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');

router.get('/conversations', conversationController.listBusinessConversations);
router.get('/conversations/:id/messages', conversationController.getConversationMessages);

module.exports = router;
