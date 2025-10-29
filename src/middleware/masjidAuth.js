const responseHelper = require('../utils/responseHelper');
const permissionChecker = require('../utils/permissionChecker');
const logger = require('../utils/logger');

/**
 * Check if user is a member of the masjid (any role)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isMasjidMember = async (req, res, next) => {
  try {
    const masjidId = req.params.id || req.params.masjidId || req.body.masjidId;
    const userId = req.userId;

    if (!masjidId) {
      return responseHelper.error(res, 'Masjid ID is required', 400);
    }

    const isMember = await permissionChecker.isMasjidMember(userId, masjidId);

    if (!isMember) {
      return responseHelper.forbidden(res, 'You are not a member of this masjid');
    }

    req.masjidId = masjidId;
    next();
  } catch (error) {
    logger.error(`Masjid member check error: ${error.message}`);
    return responseHelper.error(res, 'Permission check failed', 500);
  }
};

/**
 * Check if user is an imam for the masjid
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isMasjidImam = async (req, res, next) => {
  try {
    const masjidId = req.params.id || req.params.masjidId || req.body.masjidId;
    const userId = req.userId;

    if (!masjidId) {
      return responseHelper.error(res, 'Masjid ID is required', 400);
    }

    const isImam = await permissionChecker.isMasjidImam(userId, masjidId);

    if (!isImam) {
      return responseHelper.forbidden(res, 'You must be an imam of this masjid to perform this action');
    }

    req.masjidId = masjidId;
    next();
  } catch (error) {
    logger.error(`Masjid imam check error: ${error.message}`);
    return responseHelper.error(res, 'Permission check failed', 500);
  }
};

/**
 * Check if user is an admin for the masjid
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isMasjidAdmin = async (req, res, next) => {
  try {
    const masjidId = req.params.id || req.params.masjidId || req.body.masjidId;
    const userId = req.userId;

    if (!masjidId) {
      return responseHelper.error(res, 'Masjid ID is required', 400);
    }

    const isAdmin = await permissionChecker.isMasjidAdmin(userId, masjidId);

    if (!isAdmin) {
      return responseHelper.forbidden(res, 'You must be an admin of this masjid to perform this action');
    }

    req.masjidId = masjidId;
    next();
  } catch (error) {
    logger.error(`Masjid admin check error: ${error.message}`);
    return responseHelper.error(res, 'Permission check failed', 500);
  }
};

/**
 * Check if user is an imam OR admin for the masjid
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.isMasjidImamOrAdmin = async (req, res, next) => {
  try {
    const masjidId = req.params.id || req.params.masjidId || req.body.masjidId;
    const userId = req.userId;

    if (!masjidId) {
      return responseHelper.error(res, 'Masjid ID is required', 400);
    }

    const hasPermission = await permissionChecker.isMasjidImamOrAdmin(userId, masjidId);

    if (!hasPermission) {
      return responseHelper.forbidden(res, 'You must be an imam or admin of this masjid to perform this action');
    }

    req.masjidId = masjidId;
    next();
  } catch (error) {
    logger.error(`Masjid permission check error: ${error.message}`);
    return responseHelper.error(res, 'Permission check failed', 500);
  }
};

/**
 * Check if user can manage prayer times
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.canManagePrayerTimes = async (req, res, next) => {
  try {
    const masjidId = req.params.id || req.params.masjidId || req.body.masjidId;
    const userId = req.userId;

    if (!masjidId) {
      return responseHelper.error(res, 'Masjid ID is required', 400);
    }

    const canManage = await permissionChecker.canManagePrayerTimes(userId, masjidId);

    if (!canManage) {
      return responseHelper.forbidden(res, 'You do not have permission to manage prayer times for this masjid');
    }

    req.masjidId = masjidId;
    next();
  } catch (error) {
    logger.error(`Prayer times permission check error: ${error.message}`);
    return responseHelper.error(res, 'Permission check failed', 500);
  }
};

/**
 * Check if user can manage masjid (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.canManageMasjid = async (req, res, next) => {
  try {
    const masjidId = req.params.id || req.params.masjidId || req.body.masjidId;
    const userId = req.userId;

    if (!masjidId) {
      return responseHelper.error(res, 'Masjid ID is required', 400);
    }

    const canManage = await permissionChecker.canManageMasjid(userId, masjidId);

    if (!canManage) {
      return responseHelper.forbidden(res, 'You must be an admin to manage this masjid');
    }

    req.masjidId = masjidId;
    next();
  } catch (error) {
    logger.error(`Masjid management permission check error: ${error.message}`);
    return responseHelper.error(res, 'Permission check failed', 500);
  }
};

/**
 * Check if user can manage users (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.canManageUsers = async (req, res, next) => {
  try {
    const masjidId = req.params.id || req.params.masjidId || req.body.masjidId;
    const userId = req.userId;

    if (!masjidId) {
      return responseHelper.error(res, 'Masjid ID is required', 400);
    }

    const canManage = await permissionChecker.canManageUsers(userId, masjidId);

    if (!canManage) {
      return responseHelper.forbidden(res, 'You must be an admin to manage users for this masjid');
    }

    req.masjidId = masjidId;
    next();
  } catch (error) {
    logger.error(`User management permission check error: ${error.message}`);
    return responseHelper.error(res, 'Permission check failed', 500);
  }
};

/**
 * Check if user can view questions
 */
exports.canViewQuestions = async (req, res, next) => {
  try {
    const masjidId = req.params.id || req.params.masjidId || req.body.masjidId;
    const userId = req.userId;

    if (!masjidId) {
      return responseHelper.error(res, 'Masjid ID is required', 400);
    }

    const canView = await permissionChecker.canViewQuestions(userId, masjidId);

    if (!canView) {
      return responseHelper.forbidden(res, 'You do not have permission to view questions for this masjid');
    }

    req.masjidId = masjidId;
    next();
  } catch (error) {
    logger.error(`View questions permission check error: ${error.message}`);
    return responseHelper.error(res, 'Permission check failed', 500);
  }
};

/**
 * Check if user can answer questions
 */
exports.canAnswerQuestions = async (req, res, next) => {
  try {
    const masjidId = req.params.id || req.params.masjidId || req.body.masjidId;
    const userId = req.userId;

    if (!masjidId) {
      return responseHelper.error(res, 'Masjid ID is required', 400);
    }

    const canAnswer = await permissionChecker.canAnswerQuestions(userId, masjidId);

    if (!canAnswer) {
      return responseHelper.forbidden(res, 'You do not have permission to answer questions for this masjid');
    }

    req.masjidId = masjidId;
    next();
  } catch (error) {
    logger.error(`Answer questions permission check error: ${error.message}`);
    return responseHelper.error(res, 'Permission check failed', 500);
  }
};

/**
 * Check if user can create events
 */
exports.canCreateEvents = async (req, res, next) => {
  try {
    const masjidId = req.params.id || req.params.masjidId || req.body.masjidId;
    const userId = req.userId;

    if (!masjidId) {
      return responseHelper.error(res, 'Masjid ID is required', 400);
    }

    const canCreate = await permissionChecker.canCreateEvents(userId, masjidId);

    if (!canCreate) {
      return responseHelper.forbidden(res, 'You do not have permission to create events for this masjid');
    }

    req.masjidId = masjidId;
    next();
  } catch (error) {
    logger.error(`Create events permission check error: ${error.message}`);
    return responseHelper.error(res, 'Permission check failed', 500);
  }
};

/**
 * Check if user can create notifications
 */
exports.canCreateNotifications = async (req, res, next) => {
  try {
    const masjidId = req.params.id || req.params.masjidId || req.body.masjidId;
    const userId = req.userId;

    if (!masjidId) {
      return responseHelper.error(res, 'Masjid ID is required', 400);
    }

    const canCreate = await permissionChecker.canCreateNotifications(userId, masjidId);

    if (!canCreate) {
      return responseHelper.forbidden(res, 'You do not have permission to create notifications for this masjid');
    }

    req.masjidId = masjidId;
    next();
  } catch (error) {
    logger.error(`Create notifications permission check error: ${error.message}`);
    return responseHelper.error(res, 'Permission check failed', 500);
  }
};
