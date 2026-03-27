const express = require('express');
const router = express.Router();
const businessSettingsController = require('../controllers/businessSettingsController');

// Updates tenant message templates and fallback text.
router.put('/settings', businessSettingsController.updateBusinessSettings);

module.exports = router;
