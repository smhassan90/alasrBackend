const express = require('express');
const fs = require('fs');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const masjidRoutes = require('./masjidRoutes');
const masjidUserRoutes = require('./masjidUserRoutes');
const prayerTimeRoutes = require('./prayerTimeRoutes');
const questionRoutes = require('./questionRoutes');
const notificationRoutes = require('./notificationRoutes');
const eventRoutes = require('./eventRoutes');
const subscriptionRoutes = require('./subscriptionRoutes');
const superAdminRoutes = require('./superAdminRoutes');
const deviceSettingsRoutes = require('./deviceSettingsRoutes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'SalaahManager API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Firebase configuration test endpoint
router.get('/firebase/test', (req, res) => {
  const pushNotificationService = require('../utils/pushNotificationService');
  const firebaseStatus = pushNotificationService.getFirebaseStatus();
  
  const response = {
    success: firebaseStatus.initialized && firebaseStatus.hasRequiredFields,
    envPresent: firebaseStatus.envPresent,
    parsedJson: firebaseStatus.parsedJson,
    initialized: firebaseStatus.initialized,
    appsCount: firebaseStatus.appsCount,
    hasRequiredFields: firebaseStatus.hasRequiredFields,
    missingFields: firebaseStatus.missingFields,
    projectId: firebaseStatus.projectId,
    error: firebaseStatus.error,
    note: ''
  };

  if (!firebaseStatus.envPresent) {
    response.note = 'FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment variables.';
  } else if (!firebaseStatus.parsedJson) {
    response.note = 'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON.';
  } else if (!firebaseStatus.hasRequiredFields) {
    response.note = `Service account key is missing required fields: ${firebaseStatus.missingFields.join(', ')}. This is likely causing the 404 error on /batch endpoint.`;
  } else if (!firebaseStatus.initialized) {
    response.note = 'Service account key is valid but Firebase failed to initialize. Check logs for details.';
  } else {
    response.note = `Firebase initialized successfully for project: ${firebaseStatus.projectId}`;
  }

  return res.status(200).json(response);
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/masajids', masjidRoutes);
router.use('/masajids', masjidUserRoutes); // Masjid user management routes
router.use('/prayer-times', prayerTimeRoutes);
router.use('/questions', questionRoutes);
router.use('/notifications', notificationRoutes);
router.use('/events', eventRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/super-admin', superAdminRoutes);
router.use('/device-settings', deviceSettingsRoutes);

module.exports = router;

