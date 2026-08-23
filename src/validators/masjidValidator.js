const { body, param } = require('express-validator');

exports.createMasjidValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Masjid name is required')
    .isLength({ min: 2, max: 255 }).withMessage('Masjid name must be between 2 and 255 characters'),
  
  body('location')
    .optional()
    .trim(),
  
  body('address')
    .optional()
    .trim(),

  body('area')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Area must not exceed 100 characters'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City must not exceed 100 characters'),
  
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('State must not exceed 100 characters'),
  
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Country must not exceed 100 characters'),
  
  body('postal_code')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Postal code must not exceed 20 characters'),
  
  body('contact_email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid contact email')
    .normalizeEmail(),
  
  body('contact_phone')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Contact phone must not exceed 20 characters'),

  body('ask_imam_enabled')
    .optional()
    .isBoolean().withMessage('ask_imam_enabled must be a boolean')
    .toBoolean(),

  body('asr_fiqh')
    .optional()
    .isIn(['hanafi', 'shafai']).withMessage('asr_fiqh must be hanafi or shafai')
];

exports.updateMasjidValidator = [
  param('id')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Masjid name cannot be empty')
    .isLength({ min: 2, max: 255 }).withMessage('Masjid name must be between 2 and 255 characters'),
  
  body('location')
    .optional()
    .trim(),
  
  body('address')
    .optional()
    .trim(),

  body('area')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Area must not exceed 100 characters'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('City must not exceed 100 characters'),
  
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('State must not exceed 100 characters'),
  
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Country must not exceed 100 characters'),
  
  body('postal_code')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Postal code must not exceed 20 characters'),
  
  body('contact_email')
    .optional()
    .trim()
    .isEmail().withMessage('Please provide a valid contact email')
    .normalizeEmail(),
  
  body('contact_phone')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Contact phone must not exceed 20 characters'),
  
  body('is_active')
    .optional()
    .isBoolean().withMessage('is_active must be a boolean'),

  body('ask_imam_enabled')
    .optional()
    .isBoolean().withMessage('ask_imam_enabled must be a boolean')
    .toBoolean(),

  body('asr_fiqh')
    .optional()
    .isIn(['hanafi', 'shafai']).withMessage('asr_fiqh must be hanafi or shafai')
];

exports.masjidIdValidator = [
  param('id')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID')
];

