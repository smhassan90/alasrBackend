const express = require('express');
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

