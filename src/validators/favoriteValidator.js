const { body, param, query } = require('express-validator');

exports.addFavoriteValidator = [
  body('masjidId')
    .notEmpty().withMessage('masjidId is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('deviceId')
    .optional()
    .trim()
    .notEmpty().withMessage('Device ID cannot be empty if provided'),
  
  body('platform')
    .optional()
    .trim()
    .isIn(['android', 'ios', 'web']).withMessage('Platform must be android, ios, or web'),
  
  body('appVersion')
    .optional()
    .trim()
];

exports.removeFavoriteValidator = [
  param('masjidId')
    .notEmpty().withMessage('masjidId is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  query('deviceId')
    .optional()
    .trim()
    .notEmpty().withMessage('Device ID cannot be empty if provided'),
  
  query('platform')
    .optional()
    .trim()
    .isIn(['android', 'ios', 'web']).withMessage('Platform must be android, ios, or web'),
  
  query('appVersion')
    .optional()
    .trim()
];

exports.getFavoritesValidator = [
  query('deviceId')
    .optional()
    .trim()
    .notEmpty().withMessage('Device ID cannot be empty if provided'),
  
  query('platform')
    .optional()
    .trim()
    .isIn(['android', 'ios', 'web']).withMessage('Platform must be android, ios, or web'),
  
  query('appVersion')
    .optional()
    .trim()
];

