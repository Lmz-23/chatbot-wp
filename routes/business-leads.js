const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { authenticateToken, requireBusinessRole } = require('../middlewares/auth');

// Lead board read/update endpoints.
router.get('/leads', authenticateToken, requireBusinessRole(['OWNER', 'AGENT']), leadController.listBusinessLeads);
router.patch('/leads/:id', authenticateToken, requireBusinessRole(['OWNER', 'AGENT']), leadController.updateLead);

module.exports = router;
