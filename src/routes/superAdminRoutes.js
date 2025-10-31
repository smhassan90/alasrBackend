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
router.get('/users/:id', superAdminController.getUserById);
router.delete('/users/:id', superAdminController.deleteUser);

// Super admin promotion/demotion
router.put('/users/:id/promote', superAdminController.promoteToSuperAdmin);
router.put('/users/:id/demote', superAdminController.demoteFromSuperAdmin);
router.get('/list', superAdminController.getAllSuperAdmins);

// User activation/deactivation
router.put('/users/:id/activate', superAdminController.activateUser);
router.put('/users/:id/deactivate', superAdminController.deactivateUser);

module.exports = router;

