const { body, query } = require('express-validator');

exports.listAreasValidator = [
  query('country')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Country must not exceed 100 characters'),
  query('state')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('State must not exceed 100 characters'),
  query('city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City must not exceed 100 characters')
];

exports.createAreaValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Area name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Area name must be between 1 and 100 characters'),
  body('city')
    .trim()
    .notEmpty().withMessage('City is required')
    .isLength({ max: 100 }).withMessage('City must not exceed 100 characters'),
  body('state')
    .trim()
    .notEmpty().withMessage('State is required')
    .isLength({ max: 100 }).withMessage('State must not exceed 100 characters'),
  body('country')
    .trim()
    .notEmpty().withMessage('Country is required')
    .isLength({ max: 100 }).withMessage('Country must not exceed 100 characters')
];
