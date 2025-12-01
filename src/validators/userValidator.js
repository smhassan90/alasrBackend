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
    .isMobilePhone().withMessage('Please provide a valid phone number.')
];

exports.updateSettingsValidator = [
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

exports.registerFcmTokenValidator = [
  // Accept both fcmToken (camelCase) and fcm_token (snake_case)
  body('fcmToken')
    .optional()
    .trim()
    .notEmpty().withMessage('FCM token cannot be empty if provided')
    .isLength({ min: 10 }).withMessage('FCM token must be at least 10 characters'),
  
  body('fcm_token')
    .optional()
    .trim()
    .notEmpty().withMessage('FCM token cannot be empty if provided')
    .isLength({ min: 10 }).withMessage('FCM token must be at least 10 characters'),
  
  // Custom validation to ensure at least one FCM token field is provided
  body().custom((value) => {
    const fcmToken = value.fcmToken || value.fcm_token;
    if (!fcmToken || fcmToken.trim().length < 10) {
      throw new Error('FCM token is required and must be at least 10 characters');
    }
    return true;
  }),
  
  body('masjidId')
    .optional()
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('masjid_id')
    .optional()
    .isUUID().withMessage('Invalid masjid ID')
];

