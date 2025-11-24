const express = require('express');
const router = express.Router();
const deviceSettingsController = require('../controllers/deviceSettingsController');
const deviceSettingsValidator = require('../validators/deviceSettingsValidator');
const { validate } = require('../middleware/validation');

// Device settings routes - no authentication required (uses deviceId)
router.get('/', deviceSettingsValidator.getDeviceSettingsValidator, validate, deviceSettingsController.getDeviceSettings);
router.put('/', deviceSettingsValidator.updateDeviceSettingsValidator, validate, deviceSettingsController.updateDeviceSettings);

module.exports = router;

