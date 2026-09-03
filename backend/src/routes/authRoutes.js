const express = require('express');

const router = express.Router();

const {
  login,
  registerFirstAdmin,
  getMe,
  updateProfile,
  logout
} = require('../controllers/authController');

const { authenticate } = require('../middleware/auth');

// Login
router.post('/login', login);

// First Admin Registration
// This route must remain PUBLIC because it is used
// before the first administrator exists.
router.post('/register-first-admin', registerFirstAdmin);

// Logout
router.post('/logout', authenticate, logout);

// Current user
router.get('/me', authenticate, getMe);

// Update current user's profile
router.patch('/me', authenticate, updateProfile);

module.exports = router;