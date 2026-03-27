const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticateToken, requireBusinessRole } = require('../middlewares/auth');

// Dashboard KPI endpoint (today counters).
router.get('/stats', authenticateToken, requireBusinessRole(['OWNER', 'AGENT']), statsController.getBusinessStats);

module.exports = router;
