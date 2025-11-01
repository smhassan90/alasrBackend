const express = require('express');
const router = express.Router();
const prayerTimeController = require('../controllers/prayerTimeController');
const prayerTimeValidator = require('../validators/prayerTimeValidator');
const { validate } = require('../middleware/validation');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { optionalApiKeyOrAuth } = require('../middleware/apiKeyAuth');
const { isMasjidMember, canManagePrayerTimes, canManageMasjid } = require('../middleware/masjidAuth');

// Get today's prayer times (public or authenticated)
router.get('/masjid/:masjidId/today', prayerTimeValidator.masjidIdParamValidator, validate, optionalAuth, prayerTimeController.getTodaysPrayerTimes);

// Allow API key or JWT token for read endpoints (GET requests)
// For write endpoints (POST, PUT, DELETE), still require JWT authentication
router.use((req, res, next) => {
  // For GET requests, allow API key or JWT
  if (req.method === 'GET') {
    return optionalApiKeyOrAuth(req, res, () => {
      optionalAuth(req, res, next);
    });
  }
  // For other methods, require JWT authentication
  return authenticate(req, res, next);
});

// Get all prayer times for masjid (member check)
router.get('/masjid/:masjidId', prayerTimeValidator.masjidIdParamValidator, validate, isMasjidMember, prayerTimeController.getPrayerTimesByMasjid);

// Create/update prayer time (imam or admin)
router.post('/', prayerTimeValidator.createPrayerTimeValidator, validate, canManagePrayerTimes, prayerTimeController.createPrayerTime);

// Bulk update prayer times (imam or admin)
router.post('/bulk', prayerTimeValidator.bulkUpdateValidator, validate, canManagePrayerTimes, prayerTimeController.bulkUpdatePrayerTimes);

// Update specific prayer time (imam or admin)
router.put('/:id', prayerTimeValidator.updatePrayerTimeValidator, validate, prayerTimeController.updatePrayerTime);

// Delete prayer time (admin only)
router.delete('/:id', prayerTimeController.deletePrayerTime);

module.exports = router;

