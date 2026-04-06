const express = require('express');
const router = express.Router();
const businessSettingsController = require('../controllers/businessSettingsController');
const { authenticateToken, requireBusinessRole } = require('../middlewares/auth');

// Updates tenant message templates and fallback text.
router.put('/settings', authenticateToken, requireBusinessRole(['OWNER']), businessSettingsController.updateBusinessSettings);

module.exports = router;
