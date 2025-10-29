const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { authenticate } = require('../middleware/auth');
const { isSuperAdmin } = require('../middleware/superAdminAuth');

// All routes require authentication AND super admin status
router.use(authenticate);
router.use(isSuperAdmin);

// User management
router.get('/users', superAdminController.getAllUsers);
router.get('/users/:id', superAdminController.getUserById);

// Super admin promotion/demotion
router.put('/users/:id/promote', superAdminController.promoteToSuperAdmin);
router.put('/users/:id/demote', superAdminController.demoteFromSuperAdmin);
router.get('/list', superAdminController.getAllSuperAdmins);

// User activation/deactivation
router.put('/users/:id/activate', superAdminController.activateUser);
router.put('/users/:id/deactivate', superAdminController.deactivateUser);

module.exports = router;

