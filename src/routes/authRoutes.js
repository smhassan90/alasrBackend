const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authValidator = require('../validators/authValidator');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/register', authValidator.registerValidator, validate, authController.register);
router.post('/login', authValidator.loginValidator, validate, authController.login);
router.post('/forgot-password', authValidator.forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password', authValidator.resetPasswordValidator, validate, authController.resetPassword);
router.post('/verify-email', authValidator.verifyEmailValidator, validate, authController.verifyEmail);
router.post('/refresh-token', authController.refreshToken);

// Google OAuth routes (for general users)
router.get('/google/redirect', authController.googleRedirect);
router.get('/google/callback', authController.googleCallback);
router.post('/google', authController.googleLogin);

// Protected routes
router.post('/logout', authenticate, authController.logout);

module.exports = router;

