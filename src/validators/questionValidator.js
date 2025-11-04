const { body, param, query } = require('express-validator');

exports.setQuestionsValidator = [
  body('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('deviceId')
    .notEmpty().withMessage('Device ID is required')
    .isLength({ min: 16, max: 255 }).withMessage('Device ID must be between 16 and 255 characters'),
  
  body('platform')
    .notEmpty().withMessage('Platform is required')
    .isIn(['android', 'ios', 'web']).withMessage('Platform must be android, ios, or web'),
  
  body('appVersion')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('App version must be less than 50 characters'),
  
  body('userName')
    .trim()
    .notEmpty().withMessage('User name is required')
    .isLength({ min: 2, max: 255 }).withMessage('User name must be between 2 and 255 characters'),
  
  body('userEmail')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('title')
    .trim()
    .notEmpty().withMessage('Question title is required')
    .isLength({ min: 5, max: 255 }).withMessage('Title must be between 5 and 255 characters'),
  
  body('question')
    .trim()
    .notEmpty().withMessage('Question is required')
    .isLength({ min: 10 }).withMessage('Question must be at least 10 characters long')
];

exports.getQuestionsValidator = [
  query('deviceId')
    .notEmpty().withMessage('Device ID is required')
    .isLength({ min: 16, max: 255 }).withMessage('Device ID must be between 16 and 255 characters'),
  
  query('platform')
    .notEmpty().withMessage('Platform is required')
    .isIn(['android', 'ios', 'web']).withMessage('Platform must be android, ios, or web'),
  
  query('appVersion')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('App version must be less than 50 characters')
];

exports.createQuestionValidator = [
  body('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('userName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 255 }).withMessage('User name must be between 2 and 255 characters'),
  
  body('userEmail')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('title')
    .trim()
    .notEmpty().withMessage('Question title is required')
    .isLength({ min: 5, max: 255 }).withMessage('Title must be between 5 and 255 characters'),
  
  body('question')
    .trim()
    .notEmpty().withMessage('Question is required')
    .isLength({ min: 10 }).withMessage('Question must be at least 10 characters long')
];

exports.replyQuestionValidator = [
  param('id')
    .notEmpty().withMessage('Question ID is required')
    .isUUID().withMessage('Invalid question ID'),
  
  body('reply')
    .trim()
    .notEmpty().withMessage('Reply is required')
    .isLength({ min: 10 }).withMessage('Reply must be at least 10 characters long')
];

exports.updateQuestionStatusValidator = [
  param('id')
    .notEmpty().withMessage('Question ID is required')
    .isUUID().withMessage('Invalid question ID'),
  
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['new', 'replied']).withMessage('Status must be either new or replied')
];

exports.questionIdValidator = [
  param('id')
    .notEmpty().withMessage('Question ID is required')
    .isUUID().withMessage('Invalid question ID')
];

exports.masjidIdParamValidator = [
  param('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID')
];

exports.emailParamValidator = [
  param('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];

