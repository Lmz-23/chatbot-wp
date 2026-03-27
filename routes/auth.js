const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

// Public auth endpoints.
router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.me);
router.post('/register', authController.register);

// Lists businesses available to the authenticated user.
router.get('/businesses', authenticateToken, authController.getUserBusinesses);

module.exports = router;
