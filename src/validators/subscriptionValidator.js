const { body, param, query } = require('express-validator');

exports.subscribeValidator = [
  body('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['Prayer Times', 'Donations', 'Events', 'General']).withMessage('Invalid category. Must be one of: Prayer Times, Donations, Events, General'),
  
  body('fcmToken')
    .notEmpty().withMessage('FCM token is required for push notifications')
    .isString().withMessage('FCM token must be a string')
    .trim(),
  
  body('deviceId')
    .optional()
    .isString().withMessage('Device ID must be a string')
    .trim()
];

exports.unsubscribeValidator = [
  body('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['Prayer Times', 'Donations', 'Events', 'General']).withMessage('Invalid category'),
  
  body('deviceId')
    .optional()
    .isString().withMessage('Device ID must be a string')
    .trim()
];

exports.masjidIdParamValidator = [
  param('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID')
];

exports.getSubscriptionsQueryValidator = [
  query('deviceId')
    .optional()
    .isString().withMessage('Device ID must be a string')
    .trim()
];

