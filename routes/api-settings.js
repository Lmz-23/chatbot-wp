const express = require('express');
const router = express.Router();
const botSettingsController = require('../controllers/botSettingsController');
const { authenticateToken, requireBusinessRole } = require('../middlewares/auth');

router.get('/settings/bot', authenticateToken, requireBusinessRole(['OWNER']), botSettingsController.getBotSettings);
router.put('/settings/bot', authenticateToken, requireBusinessRole(['OWNER']), botSettingsController.updateBotSettings);

module.exports = router;