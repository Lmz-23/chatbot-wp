const express = require('express');
const router = express.Router();
const botSettingsController = require('../controllers/botSettingsController');
const settingsContextController = require('../controllers/settingsContextController');
const { authenticateToken } = require('../middlewares/auth');

router.get('/settings/bot', authenticateToken, botSettingsController.getBotSettings);
router.put('/settings/bot', authenticateToken, botSettingsController.updateBotSettings);
router.get('/settings/context', authenticateToken, settingsContextController.getSettingsContext);
router.put('/settings/context', authenticateToken, settingsContextController.updateSettingsContext);

module.exports = router;