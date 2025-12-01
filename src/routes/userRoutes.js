const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const userValidator = require('../validators/userValidator');
const authValidator = require('../validators/authValidator');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');

// All user routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', userValidator.updateProfileValidator, validate, userController.updateProfile);
router.post('/profile/picture', uploadSingle('profile_picture'), userController.uploadProfilePicture);
router.delete('/profile/picture', userController.deleteProfilePicture);

// Password and account
router.post('/change-password', authValidator.changePasswordValidator, validate, userController.changePassword);
router.delete('/account', userController.deleteAccount);

// Settings
router.get('/settings', userController.getSettings);
router.put('/settings', userValidator.updateSettingsValidator, validate, userController.updateSettings);

// User masajids
router.get('/masajids', userController.getUserMasajids);

// FCM token registration
router.post('/fcm-token', userValidator.registerFcmTokenValidator, validate, userController.registerFcmToken);

module.exports = router;

