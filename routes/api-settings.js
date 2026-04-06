const express = require('express');
const router = express.Router();
const botSettingsController = require('../controllers/botSettingsController');
const { authenticateToken } = require('../middlewares/auth');

router.get('/settings/bot', authenticateToken, botSettingsController.getBotSettings);
router.put('/settings/bot', authenticateToken, botSettingsController.updateBotSettings);

module.exports = router;