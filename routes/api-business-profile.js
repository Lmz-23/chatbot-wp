const express = require('express');
const router = express.Router();
const businessProfileController = require('../controllers/businessProfileController');
const { authenticateToken, requireBusinessRole } = require('../middlewares/auth');

router.get('/business/profile', authenticateToken, requireBusinessRole(['OWNER']), businessProfileController.getBusinessProfile);
router.put('/business/profile', authenticateToken, requireBusinessRole(['OWNER']), businessProfileController.updateBusinessProfile);

module.exports = router;