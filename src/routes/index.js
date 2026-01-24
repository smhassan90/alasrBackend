const express = require('express');
const fs = require('fs');
const path = require('path');
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
const favoriteRoutes = require('./favoriteRoutes');

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
    response.note = `Firebase initialized successfully for project: ${firebaseStatus.projectId}. IMPORTANT: If you're getting 404 errors, make sure the Firebase Cloud Messaging API (HTTP v1) is enabled in Google Cloud Console. See ENABLE_FCM_API_GUIDE.md for instructions.`;
    response.apiEnabledNote = 'To enable the API: Go to Google Cloud Console > APIs & Services > Library > Search "Firebase Cloud Messaging API" > Enable';
  }

  return res.status(200).json(response);
});

// Privacy Policy endpoint
router.get('/privacy-policy', (req, res) => {
  try {
    const privacyPolicyPath = path.join(__dirname, '..', '..', 'alasr', 'privacy-policy.html');
    
    // Check if file exists
    if (!fs.existsSync(privacyPolicyPath)) {
      return res.status(404).json({
        success: false,
        message: 'Privacy policy not found'
      });
    }
    
    // Read and send the HTML file
    const htmlContent = fs.readFileSync(privacyPolicyPath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error loading privacy policy',
      error: error.message
    });
  }
});

// Terms of Service endpoint
router.get('/terms-of-service', (req, res) => {
  try {
    const termsOfServicePath = path.join(__dirname, '..', '..', 'alasr', 'terms-of-service.html');
    
    // Check if file exists
    if (!fs.existsSync(termsOfServicePath)) {
      return res.status(404).json({
        success: false,
        message: 'Terms of service not found'
      });
    }
    
    // Read and send the HTML file
    const htmlContent = fs.readFileSync(termsOfServicePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error loading terms of service',
      error: error.message
    });
  }
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
router.use('/', favoriteRoutes); // Favorites routes (includes /users/favorites and /config/app)

module.exports = router;

