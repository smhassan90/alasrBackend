const express = require('express');
const router = express.Router();
const cronController = require('../controllers/cronController');

// Vercel Cron can call GET; also allow POST for manual triggers
router.get('/update-maghrib', cronController.updateMaghribSchedules);
router.post('/update-maghrib', cronController.updateMaghribSchedules);
router.get('/cleanup-activity-logs', cronController.cleanupActivityLogs);
router.post('/cleanup-activity-logs', cronController.cleanupActivityLogs);

module.exports = router;
