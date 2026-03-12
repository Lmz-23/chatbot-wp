const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');

router.get('/leads', leadController.listBusinessLeads);
router.patch('/leads/:id', leadController.updateLeadStatus);

module.exports = router;
