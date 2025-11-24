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
  const firebaseKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const response = {
    success: !!firebaseKey,
    envPresent: !!firebaseKey,
    parsedJson: false,
    fileExists: false,
    note: ''
  };

  if (!firebaseKey) {
    response.note = 'FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment variables.';
    return res.status(200).json(response);
  }

  // Attempt to parse as JSON
  try {
    JSON.parse(firebaseKey);
    response.parsedJson = true;
    response.note = 'Service account key detected as inline JSON.';
    return res.status(200).json(response);
  } catch (error) {
    response.parsedJson = false;
  }

  // If not JSON, treat as potential file path
  try {
    const filePath = firebaseKey.startsWith('./') ? firebaseKey : firebaseKey;
    if (fs.existsSync(filePath)) {
      response.fileExists = true;
      response.note = `Service account key detected as file path (${filePath}).`;
    } else {
      response.fileExists = false;
      response.note = `FIREBASE_SERVICE_ACCOUNT_KEY is set but file not found at path: ${filePath}`;
    }
  } catch (error) {
    response.note = `Error while checking file path: ${error.message}`;
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

