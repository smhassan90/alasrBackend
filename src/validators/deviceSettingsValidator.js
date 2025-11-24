const { body, query } = require('express-validator');

exports.getDeviceSettingsValidator = [
  query('deviceId')
    .notEmpty().withMessage('Device ID is required')
    .isString().withMessage('Device ID must be a string')
    .trim()
];

exports.updateDeviceSettingsValidator = [
  body('deviceId')
    .notEmpty().withMessage('Device ID is required')
    .isString().withMessage('Device ID must be a string')
    .trim(),
  
  body('prayer_times_notifications')
    .optional()
    .isBoolean().withMessage('prayer_times_notifications must be a boolean'),
  
  body('events_notifications')
    .optional()
    .isBoolean().withMessage('events_notifications must be a boolean'),
  
  body('donations_notifications')
    .optional()
    .isBoolean().withMessage('donations_notifications must be a boolean'),
  
  body('general_notifications')
    .optional()
    .isBoolean().withMessage('general_notifications must be a boolean'),
  
  body('questions_notifications')
    .optional()
    .isBoolean().withMessage('questions_notifications must be a boolean')
];

