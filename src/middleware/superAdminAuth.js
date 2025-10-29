const responseHelper = require('../utils/responseHelper');
const permissionChecker = require('../utils/permissionChecker');
const logger = require('../utils/logger');

/**
 * Check if user is super admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isSuperAdmin = async (req, res, next) => {
  try {
    const userId = req.userId;

    const isSuperAdmin = await permissionChecker.isSuperAdmin(userId);

    if (!isSuperAdmin) {
      return responseHelper.forbidden(res, 'Super admin access required');
    }

    next();
  } catch (error) {
    logger.error(`Super admin check error: ${error.message}`);
    return responseHelper.error(res, 'Permission check failed', 500);
  }
};

