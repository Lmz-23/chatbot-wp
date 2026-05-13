const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leadsController');
const { authenticateToken, requireBusinessRole } = require('../middlewares/auth');

router.use(authenticateToken, requireBusinessRole(['OWNER', 'AGENT']));

router.get('/business/leads', leadsController.getBusinessLeads);
router.get('/business/leads/:leadId', leadsController.getLeadById);
router.patch('/business/leads/:leadId', leadsController.updateLead);

module.exports = router;
