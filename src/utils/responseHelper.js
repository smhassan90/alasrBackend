/**
 * Standard API response helper
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
exports.success = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} error - Error details
 */
exports.error = (res, message = 'Error', statusCode = 500, error = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    error
  });
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Array of validation errors
 */
exports.validationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors
  });
};

/**
 * Send unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
exports.unauthorized = (res, message = 'Unauthorized') => {
  return res.status(401).json({
    success: false,
    message
  });
};

/**
 * Send forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
exports.forbidden = (res, message = 'Forbidden - You do not have permission to access this resource') => {
  return res.status(403).json({
    success: false,
    message
  });
};

/**
 * Send not found response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
exports.notFound = (res, message = 'Resource not found') => {
  return res.status(404).json({
    success: false,
    message
  });
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Response data
 * @param {Object} pagination - Pagination info
 * @param {string} message - Success message
 */
exports.paginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      totalItems: pagination.totalItems,
      totalPages: Math.ceil(pagination.totalItems / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.totalItems / pagination.limit),
      hasPrev: pagination.page > 1
    }
  });
};

