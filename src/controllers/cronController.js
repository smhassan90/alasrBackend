const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const maghribScheduleService = require('../services/maghribScheduleService');

/**
 * Daily cron: auto-update Maghrib for all masajids in scheduled cities.
 * @route GET/POST /api/v1/cron/update-maghrib
 * Protected by CRON_SECRET (Authorization: Bearer <secret> or x-cron-secret header)
 */
exports.updateMaghribSchedules = async (req, res) => {
  try {
    const expectedSecret = process.env.CRON_SECRET;
    if (!expectedSecret) {
      logger.error('CRON_SECRET is not configured');
      return responseHelper.error(res, 'Cron is not configured', 500);
    }

    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const headerSecret = req.headers['x-cron-secret'];
    const providedSecret = bearerToken || headerSecret || req.query.secret;

    if (providedSecret !== expectedSecret) {
      return responseHelper.forbidden(res, 'Invalid cron secret');
    }

    const summary = await maghribScheduleService.syncMaghribForAllScheduledCities();

    return responseHelper.success(res, summary, 'Maghrib schedules synced successfully');
  } catch (error) {
    logger.error(`Cron Maghrib update error: ${error.message}`, { stack: error.stack });
    return responseHelper.error(res, 'Failed to sync Maghrib schedules', 500);
  }
};
