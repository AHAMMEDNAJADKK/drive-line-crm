const express = require('express');
const router = express.Router();
const { login, getMe, updateProfile, logout } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateProfile);

module.exports = router;
