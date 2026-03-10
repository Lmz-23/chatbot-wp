const express = require('express');
const router = express.Router();
const businessSettingsController = require('../controllers/businessSettingsController');

router.put('/settings', businessSettingsController.updateBusinessSettings);

module.exports = router;
