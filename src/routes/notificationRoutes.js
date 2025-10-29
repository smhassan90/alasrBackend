const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const notificationValidator = require('../validators/notificationValidator');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { isMasjidMember, isMasjidImamOrAdmin, canManageMasjid, canCreateNotifications } = require('../middleware/masjidAuth');

// All routes require authentication
router.use(authenticate);

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

