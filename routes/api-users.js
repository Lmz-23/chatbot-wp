const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authenticateToken, requireBusinessRole } = require('../middlewares/auth');

router.get('/users', authenticateToken, requireBusinessRole(['OWNER']), usersController.listUsers);
router.post('/users', authenticateToken, requireBusinessRole(['OWNER']), usersController.createUser);
router.put('/users/:userId/status', authenticateToken, requireBusinessRole(['OWNER']), usersController.updateUserStatus);
router.put('/users/:userId/password', authenticateToken, usersController.updateUserPassword);

module.exports = router;