const express = require('express');
const router = express.Router();
const botSettingsController = require('../controllers/botSettingsController');
const settingsContextController = require('../controllers/settingsContextController');
const { authenticateToken } = require('../middlewares/auth');

function requireOwnerOrPlatformAdmin(req, res, next) {
	const user = req.user || null;
	const isPlatformAdmin = user && user.platformRole === 'PLATFORM_ADMIN';
	const isOwner = user && user.businessRole === 'OWNER';

	if (!isPlatformAdmin && !isOwner) {
		return res.status(403).json({ error: 'forbidden' });
	}

	return next();
}

router.get('/settings/bot', authenticateToken, botSettingsController.getBotSettings);
router.put('/settings/bot', authenticateToken, botSettingsController.updateBotSettings);
router.get('/settings/context', authenticateToken, requireOwnerOrPlatformAdmin, settingsContextController.getSettingsContext);
router.put('/settings/context', authenticateToken, requireOwnerOrPlatformAdmin, settingsContextController.updateSettingsContext);

module.exports = router;