const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const subscriptionValidator = require('../validators/subscriptionValidator');
const { validate } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');

// All subscription routes allow optional authentication (for anonymous users)
router.use(optionalAuth);

// Subscribe to masjid notifications
router.post('/', subscriptionValidator.subscribeValidator, validate, subscriptionController.subscribe);

// Unsubscribe from masjid notifications
router.delete('/', subscriptionValidator.unsubscribeValidator, validate, subscriptionController.unsubscribe);

// Get user's subscriptions
router.get('/', subscriptionValidator.getSubscriptionsQueryValidator, validate, subscriptionController.getSubscriptions);

// Get subscriptions for a specific masjid (for admin/imam to see subscribers)
router.get('/masjid/:masjidId', subscriptionValidator.masjidIdParamValidator, validate, subscriptionController.getMasjidSubscriptions);

// Register device with FCM token
router.post('/register-device', subscriptionValidator.registerDeviceValidator, validate, subscriptionController.registerDevice);

// Toggle masjid subscription (subscribe/unsubscribe to all enabled categories)
router.post('/masjid/:masjidId/toggle', subscriptionValidator.toggleMasjidSubscriptionValidator, validate, subscriptionController.toggleMasjidSubscription);

module.exports = router;

