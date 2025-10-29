const { body, param } = require('express-validator');

exports.createNotificationValidator = [
  body('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('title')
    .trim()
    .notEmpty().withMessage('Notification title is required')
    .isLength({ min: 3, max: 255 }).withMessage('Title must be between 3 and 255 characters'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(['Prayer Times', 'Donations', 'Events', 'General']).withMessage('Invalid category. Must be one of: Prayer Times, Donations, Events, General')
];

exports.updateNotificationValidator = [
  param('id')
    .notEmpty().withMessage('Notification ID is required')
    .isUUID().withMessage('Invalid notification ID'),
  
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ min: 3, max: 255 }).withMessage('Title must be between 3 and 255 characters'),
  
  body('description')
    .optional()
    .trim()
    .notEmpty().withMessage('Description cannot be empty')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters long'),
  
  body('category')
    .optional()
    .isIn(['Prayer Times', 'Donations', 'Events', 'General']).withMessage('Invalid category')
];

exports.notificationIdValidator = [
  param('id')
    .notEmpty().withMessage('Notification ID is required')
    .isUUID().withMessage('Invalid notification ID')
];

exports.masjidIdParamValidator = [
  param('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID')
];

