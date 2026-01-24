const { body } = require('express-validator');

exports.createUserValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  
  body('phone')
    .optional()
    .trim(),
  
  body('is_super_admin')
    .optional()
    .isBoolean().withMessage('is_super_admin must be a boolean'),
  
  body('masjid_assignment')
    .optional()
    .isObject().withMessage('masjid_assignment must be an object'),
  
  body('masjid_assignment.masjid_id')
    .optional()
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('masjid_assignment.role')
    .optional()
    .isIn(['imam', 'admin']).withMessage('Role must be either imam or admin'),
  
  body('masjid_assignment.permissions')
    .optional()
    .isObject().withMessage('Permissions must be an object')
];

exports.updateUserValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage('Name must be between 2 and 255 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  
  body('phone')
    .optional()
    .trim(),
  
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean'),
  
  body('masjid_assignment')
    .optional()
    .custom((value) => {
      // Allow null to remove assignment
      if (value === null) return true;
      // Must be an object if provided
      if (typeof value !== 'object') {
        throw new Error('masjid_assignment must be an object or null');
      }
      return true;
    }),
  
  body('masjid_assignment.masjid_id')
    .optional()
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('masjid_assignment.role')
    .optional()
    .isIn(['imam', 'admin']).withMessage('Role must be either imam or admin'),
  
  body('masjid_assignment.permissions')
    .optional()
    .isObject().withMessage('Permissions must be an object'),
  
  body('masjid_assignment.permissions.can_view_complaints')
    .optional()
    .isBoolean().withMessage('can_view_complaints must be a boolean'),
  
  body('masjid_assignment.permissions.can_answer_complaints')
    .optional()
    .isBoolean().withMessage('can_answer_complaints must be a boolean'),
  
  body('masjid_assignment.permissions.can_view_questions')
    .optional()
    .isBoolean().withMessage('can_view_questions must be a boolean'),
  
  body('masjid_assignment.permissions.can_answer_questions')
    .optional()
    .isBoolean().withMessage('can_answer_questions must be a boolean'),
  
  body('masjid_assignment.permissions.can_change_prayer_times')
    .optional()
    .isBoolean().withMessage('can_change_prayer_times must be a boolean'),
  
  body('masjid_assignment.permissions.can_create_events')
    .optional()
    .isBoolean().withMessage('can_create_events must be a boolean'),
  
  body('masjid_assignment.permissions.can_create_notifications')
    .optional()
    .isBoolean().withMessage('can_create_notifications must be a boolean')
];

exports.sendNotificationToImamsValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 1, max: 255 }).withMessage('Title must be between 1 and 255 characters'),
  
  body('body')
    .trim()
    .notEmpty().withMessage('Body is required')
    .isLength({ min: 1 }).withMessage('Body must not be empty'),
  
  body('masjidId')
    .optional()
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('data')
    .optional()
    .isObject().withMessage('Data must be an object')
];

exports.addImamFcmTokenValidator = [
  body('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('fcmToken')
    .trim()
    .notEmpty().withMessage('FCM token is required')
    .isLength({ min: 10 }).withMessage('FCM token must be at least 10 characters')
];

exports.updateAppConfigValidator = [
  body('maxFavoritesLimit')
    .notEmpty().withMessage('maxFavoritesLimit is required')
    .isInt({ min: 1, max: 20 }).withMessage('maxFavoritesLimit must be an integer between 1 and 20')
];

