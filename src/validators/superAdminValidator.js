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

