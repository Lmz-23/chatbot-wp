const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requirePlatformAdmin } = require('../middlewares/auth');

router.use(authenticateToken, requirePlatformAdmin);

router.get('/businesses', adminController.listBusinesses);
router.post('/businesses', adminController.createBusiness);
router.get('/businesses/:businessId', adminController.getBusinessById);
router.put('/businesses/:businessId', adminController.updateBusiness);
router.delete('/businesses/:businessId', adminController.deleteBusiness);
router.put('/businesses/:businessId/status', adminController.updateBusinessStatus);
router.post('/businesses/:businessId/users', adminController.createBusinessUser);
router.put('/businesses/:businessId/users/:userId/status', adminController.updateBusinessUserStatus);
router.get('/stats', adminController.getStats);

module.exports = router;
