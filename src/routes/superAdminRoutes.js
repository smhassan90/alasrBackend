const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const superAdminValidator = require('../validators/superAdminValidator');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { isSuperAdmin } = require('../middleware/superAdminAuth');

// All routes require authentication AND super admin status
router.use(authenticate);
router.use(isSuperAdmin);

// User management
router.get('/users', superAdminController.getAllUsers);
router.post('/users', superAdminValidator.createUserValidator, validate, superAdminController.createUser);

// Specific routes MUST come before generic /users/:id route
// Super admin promotion/demotion
router.put('/users/:id/promote', superAdminController.promoteToSuperAdmin);
router.put('/users/:id/demote', superAdminController.demoteFromSuperAdmin);

// User activation/deactivation
router.put('/users/:id/activate', superAdminController.activateUser);
router.put('/users/:id/deactivate', superAdminController.deactivateUser);

// Generic user routes (must come after specific routes)
router.get('/users/:id', superAdminController.getUserById);
router.put('/users/:id', superAdminValidator.updateUserValidator, validate, superAdminController.updateUser);
router.delete('/users/:id', superAdminController.deleteUser);

// Super admin list
router.get('/list', superAdminController.getAllSuperAdmins);

// API Key management
router.get('/api-key', superAdminController.getApiKey);
router.post('/api-key/generate', superAdminController.generateApiKey);

// Send notification to imams
router.post('/notifications/send-to-imams', superAdminValidator.sendNotificationToImamsValidator, validate, superAdminController.sendNotificationToImams);

// Get imam subscription status (debug endpoint)
router.get('/imams/subscriptions', superAdminController.getImamSubscriptions);

// Add/update FCM token for imam subscription (helper for testing)
router.post('/imams/:imamId/subscription', superAdminValidator.addImamFcmTokenValidator, validate, superAdminController.addImamFcmToken);

module.exports = router;

