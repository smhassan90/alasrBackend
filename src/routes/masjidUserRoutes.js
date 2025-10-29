const express = require('express');
const router = express.Router();
const masjidUserController = require('../controllers/masjidUserController');
const masjidUserValidator = require('../validators/masjidUserValidator');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { canManageUsers, isMasjidMember } = require('../middleware/masjidAuth');

// All routes require authentication
router.use(authenticate);

// Add user to masjid (admin only)
router.post('/:id/users', masjidUserValidator.addUserValidator, validate, canManageUsers, masjidUserController.addUserToMasjid);

// Remove user from masjid (admin only)
router.delete('/:id/users/:userId', masjidUserValidator.removeUserValidator, validate, canManageUsers, masjidUserController.removeUserFromMasjid);

// Update user role (admin only)
router.put('/:id/users/:userId/role', masjidUserValidator.updateUserRoleValidator, validate, canManageUsers, masjidUserController.updateUserRole);

// Get imams (member check)
router.get('/:id/imams', isMasjidMember, masjidUserController.getImams);

// Get admins (member check)
router.get('/:id/admins', isMasjidMember, masjidUserController.getAdmins);

// Transfer ownership (admin only)
router.post('/:id/transfer-ownership', masjidUserValidator.transferOwnershipValidator, validate, canManageUsers, masjidUserController.transferOwnership);

module.exports = router;

