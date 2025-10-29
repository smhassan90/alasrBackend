const { body, param } = require('express-validator');

exports.addUserValidator = [
  param('id')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('userId')
    .notEmpty().withMessage('User ID is required')
    .isUUID().withMessage('Invalid user ID'),
  
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['imam', 'admin']).withMessage('Role must be either imam or admin'),
  
  body('permissions')
    .optional()
    .isObject().withMessage('Permissions must be an object'),
  
  body('permissions.can_view_complaints')
    .optional()
    .isBoolean().withMessage('can_view_complaints must be a boolean'),
  
  body('permissions.can_answer_complaints')
    .optional()
    .isBoolean().withMessage('can_answer_complaints must be a boolean'),
  
  body('permissions.can_view_questions')
    .optional()
    .isBoolean().withMessage('can_view_questions must be a boolean'),
  
  body('permissions.can_answer_questions')
    .optional()
    .isBoolean().withMessage('can_answer_questions must be a boolean'),
  
  body('permissions.can_change_prayer_times')
    .optional()
    .isBoolean().withMessage('can_change_prayer_times must be a boolean'),
  
  body('permissions.can_create_events')
    .optional()
    .isBoolean().withMessage('can_create_events must be a boolean'),
  
  body('permissions.can_create_notifications')
    .optional()
    .isBoolean().withMessage('can_create_notifications must be a boolean')
];

exports.removeUserValidator = [
  param('id')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  param('userId')
    .notEmpty().withMessage('User ID is required')
    .isUUID().withMessage('Invalid user ID')
];

exports.updateUserRoleValidator = [
  param('id')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  param('userId')
    .notEmpty().withMessage('User ID is required')
    .isUUID().withMessage('Invalid user ID'),
  
  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['imam', 'admin']).withMessage('Role must be either imam or admin')
];

exports.transferOwnershipValidator = [
  param('id')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('newAdminId')
    .notEmpty().withMessage('New admin ID is required')
    .isUUID().withMessage('Invalid user ID')
];

