const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const notificationValidator = require('../validators/notificationValidator');
const { validate } = require('../middleware/validation');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { optionalApiKeyOrAuth } = require('../middleware/apiKeyAuth');
const { isMasjidMember, isMasjidImamOrAdmin, canManageMasjid, canCreateNotifications } = require('../middleware/masjidAuth');

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

// Get all notifications for masjid (member check)
router.get('/masjid/:masjidId', notificationValidator.masjidIdParamValidator, validate, isMasjidMember, notificationController.getNotificationsByMasjid);

// Get recent notifications (member check)
router.get('/masjid/:masjidId/recent', notificationValidator.masjidIdParamValidator, validate, isMasjidMember, notificationController.getRecentNotifications);

// Get single notification (member check - checked in controller)
router.get('/:id', notificationValidator.notificationIdValidator, validate, notificationController.getNotificationById);

// Create notification (requires can_create_notifications permission)
router.post('/', notificationValidator.createNotificationValidator, validate, canCreateNotifications, notificationController.createNotification);

// Update notification (requires can_create_notifications permission)
router.put('/:id', notificationValidator.updateNotificationValidator, validate, notificationController.updateNotification);

// Delete notification (admin only)
router.delete('/:id', notificationValidator.notificationIdValidator, validate, notificationController.deleteNotification);

module.exports = router;

