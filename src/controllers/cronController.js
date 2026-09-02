const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const maghribScheduleService = require('../services/maghribScheduleService');
const activityLogService = require('../services/activityLogService');
const eventReminderService = require('../services/eventReminderService');

/**
 * Authorize cron callers:
 * - Authorization: Bearer <CRON_SECRET> (Vercel sets this when CRON_SECRET env is present)
 * - x-cron-secret: <CRON_SECRET>
 * - ?secret=<CRON_SECRET>
 * - x-vercel-cron: 1 (Vercel cron invocation header) when CRON_SECRET is not configured
 */
function isAuthorizedCronRequest(req) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const headerSecret = req.headers['x-cron-secret'];
  const providedSecret = bearerToken || headerSecret || req.query.secret;
  const isVercelCron = req.headers['x-vercel-cron'] === '1';

  if (expectedSecret) {
    return providedSecret === expectedSecret;
  }

  // Without CRON_SECRET, only allow verified Vercel cron invocations
  if (isVercelCron) {
    logger.warn('CRON_SECRET is not set; allowing request via x-vercel-cron header');
    return true;
  }

  return false;
}

/**
 * Daily cron: auto-update Maghrib for all masajids in scheduled cities.
 * @route GET/POST /api/v1/cron/update-maghrib
 */
exports.updateMaghribSchedules = async (req, res) => {
  try {
    if (!process.env.CRON_SECRET && req.headers['x-vercel-cron'] !== '1') {
      logger.error('CRON_SECRET is not configured and request is not a Vercel cron');
      return responseHelper.error(res, 'Cron is not configured. Set CRON_SECRET in Vercel env.', 500);
    }

    if (!isAuthorizedCronRequest(req)) {
      return responseHelper.forbidden(res, 'Invalid cron secret');
    }

    const summary = await maghribScheduleService.syncMaghribForAllScheduledCities();

    return responseHelper.success(res, summary, 'Maghrib schedules synced successfully');
  } catch (error) {
    logger.error(`Cron Maghrib update error: ${error.message}`, { stack: error.stack });
    return responseHelper.error(res, 'Failed to sync Maghrib schedules', 500);
  }
};

/**
 * Daily cron: delete activity logs older than 7 days.
 * @route GET/POST /api/v1/cron/cleanup-activity-logs
 */
exports.cleanupActivityLogs = async (req, res) => {
  try {
    if (!process.env.CRON_SECRET && req.headers['x-vercel-cron'] !== '1') {
      logger.error('CRON_SECRET is not configured and request is not a Vercel cron');
      return responseHelper.error(res, 'Cron is not configured. Set CRON_SECRET in Vercel env.', 500);
    }

    if (!isAuthorizedCronRequest(req)) {
      return responseHelper.forbidden(res, 'Invalid cron secret');
    }

    const deleted = await activityLogService.pruneOldLogs();
    return responseHelper.success(res, { deleted }, 'Old activity logs cleaned up');
  } catch (error) {
    logger.error(`Cron activity log cleanup error: ${error.message}`, { stack: error.stack });
    return responseHelper.error(res, 'Failed to clean up activity logs', 500);
  }
};

/**
 * Frequent cron: notify subscribers 15 minutes before today's events.
 * @route GET/POST /api/v1/cron/notify-upcoming-events
 */
exports.notifyUpcomingEvents = async (req, res) => {
  try {
    if (!process.env.CRON_SECRET && req.headers['x-vercel-cron'] !== '1') {
      logger.error('CRON_SECRET is not configured and request is not a Vercel cron');
      return responseHelper.error(res, 'Cron is not configured. Set CRON_SECRET in Vercel env.', 500);
    }

    if (!isAuthorizedCronRequest(req)) {
      return responseHelper.forbidden(res, 'Invalid cron secret');
    }

    const summary = await eventReminderService.notifyUpcomingEvents();
    return responseHelper.success(res, summary, 'Upcoming event reminders processed');
  } catch (error) {
    logger.error(`Cron event reminder error: ${error.message}`, { stack: error.stack });
    return responseHelper.error(res, 'Failed to send event reminders', 500);
  }
};
