const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.me);
router.post('/register', authController.register);
router.get('/businesses', authenticateToken, authController.getUserBusinesses);

module.exports = router;
