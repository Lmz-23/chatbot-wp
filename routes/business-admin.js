const express = require('express');
const router = express.Router();
const businessAdminController = require('../controllers/businessAdminController');
const { authenticateToken, requirePlatformAdmin } = require('../middlewares/auth');

router.post('/', authenticateToken, requirePlatformAdmin, businessAdminController.createBusiness);

module.exports = router;
