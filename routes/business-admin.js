const express = require('express');
const router = express.Router();
const businessAdminController = require('../controllers/businessAdminController');
const { authenticateToken, requirePlatformAdmin } = require('../middlewares/auth');

// Platform-only endpoint to create tenant businesses.
router.post('/', authenticateToken, requirePlatformAdmin, businessAdminController.createBusiness);

module.exports = router;
