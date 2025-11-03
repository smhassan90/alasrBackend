const { body, param } = require('express-validator');

exports.createQuestionValidator = [
  body('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
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

