const express = require('express');
const router = express.Router();
const { register, login, logoutAll } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Register a new user (role is always 'user')
router.post('/register', register);

// Login user/admin
router.post('/login', login);

// Logout all sessions
router.post('/logout-all', authMiddleware, logoutAll);

module.exports = router;
