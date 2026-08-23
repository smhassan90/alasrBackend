const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const activityLogService = require('../services/activityLogService');

/**
 * List last 7 days of activity for a masjid (members only)
 * @route GET /api/v1/activity-logs/masjid/:masjidId
 */
exports.getMasjidLogs = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const result = await activityLogService.listLogs({ masjidId, page, limit });
    return responseHelper.paginated(res, result.logs, result.pagination, 'Activity logs retrieved');
  } catch (error) {
    logger.error(`Get masjid activity logs error: ${error.message}`);
    return responseHelper.error(res, 'Failed to load activity logs', 500);
  }
};

/**
 * List last 7 days of activity across all masajids (super admin)
 * @route GET /api/v1/super-admin/activity-logs
 */
exports.getAllLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const result = await activityLogService.listLogs({ page, limit });
    return responseHelper.paginated(res, result.logs, result.pagination, 'Activity logs retrieved');
  } catch (error) {
    logger.error(`Get all activity logs error: ${error.message}`);
    return responseHelper.error(res, 'Failed to load activity logs', 500);
  }
};
