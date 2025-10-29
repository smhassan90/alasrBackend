const { validationResult } = require('express-validator');
const responseHelper = require('../utils/responseHelper');

/**
 * Validate request using express-validator
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));
    
    return responseHelper.validationError(res, formattedErrors);
  }
  
  next();
};

