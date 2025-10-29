const express = require('express');
const router = express.Router();
const masjidController = require('../controllers/masjidController');
const masjidValidator = require('../validators/masjidValidator');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { isMasjidMember, canManageMasjid } = require('../middleware/masjidAuth');

// All masjid routes require authentication
router.use(authenticate);

// Get all masajids for user (no specific masjid permission needed)
router.get('/', masjidController.getAllMasajids);

// Create masjid (no specific masjid permission needed)
router.post('/', masjidValidator.createMasjidValidator, validate, masjidController.createMasjid);

// Get single masjid (member check)
router.get('/:id', masjidValidator.masjidIdValidator, validate, isMasjidMember, masjidController.getMasjidById);

// Update masjid (admin only)
router.put('/:id', masjidValidator.updateMasjidValidator, validate, canManageMasjid, masjidController.updateMasjid);

// Delete masjid (admin only)
router.delete('/:id', masjidValidator.masjidIdValidator, validate, canManageMasjid, masjidController.deleteMasjid);

// Set default masjid (member check)
router.put('/:id/set-default', masjidValidator.masjidIdValidator, validate, isMasjidMember, masjidController.setDefaultMasjid);

// Get masjid statistics (member check)
router.get('/:id/statistics', masjidValidator.masjidIdValidator, validate, isMasjidMember, masjidController.getMasjidStatistics);

// Get masjid members (member check)
router.get('/:id/members', masjidValidator.masjidIdValidator, validate, isMasjidMember, masjidController.getMasjidMembers);

module.exports = router;

