const { body } = require('express-validator');

exports.updateProfileValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters'),
  
  body('phone')
    .optional()
    .trim()
    .isMobilePhone().withMessage('Please provide a valid phone number')
];

exports.updateSettingsValidator = [
  body('prayer_times_notifications')
    .optional()
    .isBoolean().withMessage('prayer_times_notifications must be a boolean.'),
  
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

