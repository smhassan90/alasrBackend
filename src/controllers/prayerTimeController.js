const { PrayerTime, Masjid, User, Event, MasjidSubscription, UserSettings, DeviceSettings, UserMasjid, sequelize } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const pushNotificationService = require('../utils/pushNotificationService');
const maghribScheduleService = require('../services/maghribScheduleService');
const { ensureAsrFiqhColumn } = require('../utils/ensureAsrFiqhColumn');
const activityLogService = require('../services/activityLogService');
const { Op } = require('sequelize');

const PRAYER_ORDER = "FIELD(prayer_name, 'Fajr', 'Dhuhr', 'Jummah', 'Asr', 'Maghrib', 'Isha')";
const PUBLIC_RANGE_DAYS = 62;
const PUBLIC_ROW_CAP = 400;
const IMAM_ROW_CAP = 2000;

async function findLatestPrayerTimes(masjidId, today) {
  return sequelize.query(
    `SELECT pt.*
     FROM prayer_times AS pt
     INNER JOIN (
       SELECT prayer_name, MAX(effective_date) AS max_date
       FROM prayer_times
       WHERE masjid_id = :masjidId AND effective_date <= :today
       GROUP BY prayer_name
     ) AS latest
       ON latest.prayer_name = pt.prayer_name
      AND latest.max_date = pt.effective_date
     WHERE pt.masjid_id = :masjidId
     ORDER BY FIELD(pt.prayer_name, 'Fajr', 'Dhuhr', 'Jummah', 'Asr', 'Maghrib', 'Isha')`,
    {
      replacements: { masjidId, today },
      model: PrayerTime,
      mapToModel: true
    }
  );
}

// Debounce mechanism to prevent duplicate notifications
// Tracks the last notification time for each masjid (for individual updates only)
const notificationDebounceMap = new Map();
const INDIVIDUAL_UPDATE_DEBOUNCE_MS = 5000; // 5 seconds - prevent duplicate individual notifications within this window

/**
 * Check if an individual notification should be sent (debounce check)
 * Note: Bulk updates should always send notifications and bypass this check
 * @param {number} masjidId - Masjid ID
 * @returns {boolean} - true if notification should be sent, false if debounced
 */
function shouldSendIndividualNotification(masjidId) {
  const now = Date.now();
  const lastNotificationTime = notificationDebounceMap.get(masjidId);
  
  if (!lastNotificationTime || (now - lastNotificationTime) >= INDIVIDUAL_UPDATE_DEBOUNCE_MS) {
    notificationDebounceMap.set(masjidId, now);
    return true;
  }
  
  logger.info(`Individual notification for masjid ${masjidId} debounced (last sent ${Math.round((now - lastNotificationTime) / 1000)}s ago)`);
  return false;
}

/**
 * Get all prayer times for a masjid
 * @route GET /api/prayer-times/masjid/:masjidId
 */
exports.getPrayerTimesByMasjid = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const { effectiveDate, startDate, endDate } = req.query;
    const isPublicRead = !!(req.isApiKeyAuth || req.apiKeyAuth);

    const masjid = await Masjid.findByPk(masjidId, {
      attributes: ['id', 'name', 'city', 'created_by']
    });
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    const whereClause = { masjid_id: masjidId };
    const rowCap = isPublicRead ? PUBLIC_ROW_CAP : IMAM_ROW_CAP;

    if (effectiveDate) {
      whereClause.effective_date = effectiveDate;
    } else if (startDate && endDate) {
      whereClause.effective_date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      whereClause.effective_date = { [Op.gte]: startDate };
    } else if (endDate) {
      whereClause.effective_date = { [Op.lte]: endDate };
    }

    const prayerTimes = await PrayerTime.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [
        ['effective_date', 'DESC'],
        [sequelize.literal(PRAYER_ORDER)]
      ],
      limit: rowCap
    });

    let result = prayerTimes;

    // Maghrib comes from the city sunset schedule, recalculated per effective date
    if (maghribScheduleService.hasAutomatedMaghrib(masjid.city)) {
      result = maghribScheduleService.applyScheduledMaghribByDate(masjid, prayerTimes, {
        startDate: startDate || effectiveDate || null,
        endDate: endDate || effectiveDate || null,
        maxDays: isPublicRead ? PUBLIC_RANGE_DAYS : 400
      });
    }

    return responseHelper.success(res, result, 'Prayer times retrieved successfully');
  } catch (error) {
    logger.error(`Get prayer times error: ${error.message}`, { error: error.stack, masjidId: req.params?.masjidId });
    return responseHelper.error(res, `Failed to retrieve prayer times: ${error.message}`, 500);
  }
};

/**
 * Get today's prayer times for a masjid
 * @route GET /api/prayer-times/masjid/:masjidId/today
 */
exports.getTodaysPrayerTimes = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const masjid = await Masjid.findByPk(masjidId, {
      attributes: ['id', 'name', 'city', 'created_by']
    });
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    // Use city-local date when Maghrib is automated for this city
    const today = maghribScheduleService.hasAutomatedMaghrib(masjid.city)
      ? maghribScheduleService.getTodayForCity(masjid.city)
      : new Date().toISOString().split('T')[0];

    const latestPrayerTimes = await findLatestPrayerTimes(masjidId, today);
    let result = latestPrayerTimes;

    // Overlay interpolated Maghrib in memory. Persist via cron / Imam writes, not public GET.
    if (maghribScheduleService.hasAutomatedMaghrib(masjid.city)) {
      result = maghribScheduleService.applyScheduledMaghribToPrayerTimes(masjid, result, today);
    }

    res.set('Cache-Control', 'public, max-age=300');
    return responseHelper.success(res, result, 'Today\'s prayer times retrieved successfully');
  } catch (error) {
    logger.error(`Get today's prayer times error: ${error.message}`, { error: error.stack, masjidId: req.params?.masjidId });
    return responseHelper.error(res, `Failed to retrieve prayer times: ${error.message}`, 500);
  }
};

/**
 * Home bundle: masjid + today's prayer times + upcoming events
 * @route GET /api/prayer-times/masjid/:masjidId/home-summary
 */
exports.getHomeSummary = async (req, res) => {
  try {
    const { masjidId } = req.params;
    await ensureAsrFiqhColumn(sequelize);
    const masjid = await Masjid.findByPk(masjidId, {
      attributes: [
        'id', 'name', 'location', 'address', 'area', 'city', 'state', 'country',
        'postal_code', 'contact_email', 'contact_phone', 'is_active',
        'ask_imam_enabled', 'asr_fiqh', 'created_at', 'updated_at'
      ]
    });
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    const today = maghribScheduleService.hasAutomatedMaghrib(masjid.city)
      ? maghribScheduleService.getTodayForCity(masjid.city)
      : new Date().toISOString().split('T')[0];

    const [latestPrayerTimes, events] = await Promise.all([
      findLatestPrayerTimes(masjidId, today),
      Event.findAll({
        where: {
          masjid_id: masjidId,
          status: 'active',
          [Op.or]: [
            { event_type: 'recurring' },
            { event_type: 'one_time', event_date: { [Op.gte]: today } }
          ]
        },
        order: [['event_date', 'ASC'], ['event_time', 'ASC']],
        limit: 3
      })
    ]);

    let prayerTimes = latestPrayerTimes;
    if (maghribScheduleService.hasAutomatedMaghrib(masjid.city)) {
      prayerTimes = maghribScheduleService.applyScheduledMaghribToPrayerTimes(masjid, prayerTimes, today);
    }

    res.set('Cache-Control', 'public, max-age=120');
    return responseHelper.success(res, {
      masjid,
      prayerTimes,
      events
    }, 'Home summary retrieved successfully');
  } catch (error) {
    logger.error(`Get home summary error: ${error.message}`, { error: error.stack, masjidId: req.params?.masjidId });
    return responseHelper.error(res, `Failed to retrieve home summary: ${error.message}`, 500);
  }
};

/**
 * Create or update prayer time
 * @route POST /api/prayer-times
 */
exports.createPrayerTime = async (req, res) => {
  try {
    const { masjidId, prayerName, prayerTime, effectiveDate, notifyUsers } = req.body;

    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    // Maghrib is automated from city sunset schedule — imams cannot set it manually
    if (prayerName === 'Maghrib' && maghribScheduleService.hasAutomatedMaghrib(masjid.city)) {
      const syncResult = await maghribScheduleService.syncMaghribForMasjid(masjid, effectiveDate || null);
      return responseHelper.success(
        res,
        syncResult.prayerTime,
        `Maghrib is auto-set from ${masjid.city} sunset schedule and cannot be updated manually`
      );
    }

    const date = effectiveDate || new Date().toISOString().split('T')[0];

    // Check if prayer time already exists
    const existingPrayerTime = await PrayerTime.findOne({
      where: {
        masjid_id: masjidId,
        prayer_name: prayerName,
        effective_date: date
      }
    });

    let prayerTimeRecord;
    const wasUpdate = !!existingPrayerTime;
    let timeChanged = false;

    if (existingPrayerTime) {
      // Check if prayer time actually changed
      const oldTime = existingPrayerTime.prayer_time;
      timeChanged = oldTime !== prayerTime;
      
      // Update existing
      existingPrayerTime.prayer_time = prayerTime;
      existingPrayerTime.updated_by = req.userId;
      if (notifyUsers !== undefined) {
        existingPrayerTime.notify_users = notifyUsers;
      }
      await existingPrayerTime.save();
      prayerTimeRecord = existingPrayerTime;
      
      logger.info(`Prayer time updated: ${prayerName} for masjid ${masjidId} by ${req.userId}`);
    } else {
      // Create new - always notify for new prayer times
      timeChanged = true;
      prayerTimeRecord = await PrayerTime.create({
        masjid_id: masjidId,
        prayer_name: prayerName,
        prayer_time: prayerTime,
        effective_date: date,
        updated_by: req.userId,
        notify_users: notifyUsers || false
      });
      
      logger.info(`Prayer time created: ${prayerName} for masjid ${masjidId} by ${req.userId}`);
    }

    // Send notifications automatically when prayer time changes (only to subscribed users)
    // The sendPrayerTimeNotifications function already filters by user preferences
    // Exclude the user who made the change (imam/admin) from receiving notifications
    if (timeChanged) {
      sendPrayerTimeNotifications(masjid, prayerTimeRecord, req.userId).catch(err => {
        logger.error(`Failed to send prayer time notifications: ${err.message}`);
      });
      activityLogService.logPrayerTimeUpdate({
        masjidId,
        userId: req.userId,
        actorName: req.user?.name,
        prayerName,
        prayerTime
      }).catch(() => {});
    }

    return responseHelper.success(res, prayerTimeRecord, 'Prayer time saved successfully', wasUpdate ? 200 : 201);
  } catch (error) {
    logger.error(`Create prayer time error: ${error.message}`);
    return responseHelper.error(res, 'Failed to save prayer time', 500);
  }
};

/**
 * Update specific prayer time
 * @route PUT /api/prayer-times/:id
 */
exports.updatePrayerTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { prayerTime, effectiveDate, notifyUsers } = req.body;

    const prayerTimeRecord = await PrayerTime.findByPk(id, {
      include: [{
        model: Masjid,
        as: 'masjid'
      }]
    });
    if (!prayerTimeRecord) {
      return responseHelper.notFound(res, 'Prayer time not found');
    }

    if (
      prayerTimeRecord.prayer_name === 'Maghrib' &&
      maghribScheduleService.hasAutomatedMaghrib(prayerTimeRecord.masjid?.city)
    ) {
      const syncResult = await maghribScheduleService.syncMaghribForMasjid(prayerTimeRecord.masjid);
      return responseHelper.success(
        res,
        syncResult.prayerTime || prayerTimeRecord,
        `Maghrib is auto-set from ${prayerTimeRecord.masjid.city} sunset schedule and cannot be updated manually`
      );
    }

    // Check if prayer time actually changed
    const oldTime = prayerTimeRecord.prayer_time;
    let timeChanged = false;

    if (prayerTime) {
      timeChanged = oldTime !== prayerTime;
      prayerTimeRecord.prayer_time = prayerTime;
    }
    if (effectiveDate) prayerTimeRecord.effective_date = effectiveDate;
    if (notifyUsers !== undefined) prayerTimeRecord.notify_users = notifyUsers;
    prayerTimeRecord.updated_by = req.userId;

    await prayerTimeRecord.save();

    logger.info(`Prayer time ${id} updated by ${req.userId}`);

    // Send notifications automatically when prayer time changes (only to subscribed users)
    // The sendPrayerTimeNotifications function already filters by user preferences
    // Exclude the user who made the change (imam/admin) from receiving notifications
    if (timeChanged) {
      sendPrayerTimeNotifications(prayerTimeRecord.masjid, prayerTimeRecord, req.userId).catch(err => {
        logger.error(`Failed to send prayer time notifications: ${err.message}`);
      });
      activityLogService.logPrayerTimeUpdate({
        masjidId: prayerTimeRecord.masjid_id,
        userId: req.userId,
        actorName: req.user?.name,
        prayerName: prayerTimeRecord.prayer_name,
        prayerTime: prayerTimeRecord.prayer_time
      }).catch(() => {});
    }

    return responseHelper.success(res, prayerTimeRecord, 'Prayer time updated successfully');
  } catch (error) {
    logger.error(`Update prayer time error: ${error.message}`);
    return responseHelper.error(res, 'Failed to update prayer time', 500);
  }
};

/**
 * Delete prayer time
 * @route DELETE /api/prayer-times/:id
 */
exports.deletePrayerTime = async (req, res) => {
  try {
    const { id } = req.params;

    const prayerTime = await PrayerTime.findByPk(id);
    if (!prayerTime) {
      return responseHelper.notFound(res, 'Prayer time not found');
    }

    await prayerTime.destroy();

    logger.info(`Prayer time ${id} deleted by ${req.userId}`);

    return responseHelper.success(res, null, 'Prayer time deleted successfully');
  } catch (error) {
    logger.error(`Delete prayer time error: ${error.message}`);
    return responseHelper.error(res, 'Failed to delete prayer time', 500);
  }
};

/**
 * Bulk update all prayer times for a masjid
 * @route POST /api/prayer-times/bulk
 */
exports.bulkUpdatePrayerTimes = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { masjidId, prayerTimes, effectiveDate, notifyUsers } = req.body;

    const masjid = await Masjid.findByPk(masjidId, { transaction });
    if (!masjid) {
      await transaction.rollback();
      return responseHelper.notFound(res, 'Masjid not found');
    }

    const date = effectiveDate || new Date().toISOString().split('T')[0];
    const maghribAutomated = maghribScheduleService.hasAutomatedMaghrib(masjid.city);

    const incoming = (prayerTimes || []).filter(
      pt => !(pt.prayerName === 'Maghrib' && maghribAutomated)
    );

    const existingRows = await PrayerTime.findAll({
      where: {
        masjid_id: masjidId,
        effective_date: date
      },
      transaction
    });
    const existingByName = new Map(existingRows.map(row => [row.prayer_name, row]));

    let hasChanges = false;
    const changedPrayers = [];
    const upsertRows = incoming.map(pt => {
      const existing = existingByName.get(pt.prayerName);
      if (!existing || existing.prayer_time !== pt.prayerTime) {
        hasChanges = true;
        changedPrayers.push({ prayerName: pt.prayerName, prayerTime: pt.prayerTime });
      }
      return {
        masjid_id: masjidId,
        prayer_name: pt.prayerName,
        prayer_time: pt.prayerTime,
        effective_date: date,
        updated_by: req.userId,
        notify_users: notifyUsers !== undefined ? notifyUsers : (existing?.notify_users || false)
      };
    });

    if (upsertRows.length > 0) {
      await PrayerTime.bulkCreate(upsertRows, {
        updateOnDuplicate: ['prayer_time', 'updated_by', 'notify_users', 'updated_at'],
        transaction
      });
    }

    const createdPrayerTimes = incoming.length
      ? await PrayerTime.findAll({
          where: {
            masjid_id: masjidId,
            effective_date: date,
            prayer_name: { [Op.in]: incoming.map(pt => pt.prayerName) }
          },
          transaction
        })
      : [];

    await transaction.commit();

    // Always keep Maghrib aligned with city sunset schedule
    if (maghribAutomated) {
      try {
        const syncResult = await maghribScheduleService.syncMaghribForMasjid(masjid, date);
        if (syncResult.prayerTime) {
          createdPrayerTimes.push(syncResult.prayerTime);
        }
      } catch (err) {
        logger.error(`Failed to auto-sync Maghrib after bulk update for masjid ${masjidId}: ${err.message}`);
      }
    }

    logger.info(`Bulk prayer times updated for masjid ${masjidId} by ${req.userId}`);

    // Send notifications automatically when prayer times change (only to subscribed users)
    // The sendPrayerTimeBulkNotifications function already filters by user preferences
    // Exclude the user who made the change (imam/admin) from receiving notifications
    if (hasChanges) {
      sendPrayerTimeBulkNotifications(masjid, createdPrayerTimes, req.userId).catch(err => {
        logger.error(`Failed to send bulk prayer time notifications: ${err.message}`);
      });
      changedPrayers.forEach((change) => {
        activityLogService.logPrayerTimeUpdate({
          masjidId,
          userId: req.userId,
          actorName: req.user?.name,
          prayerName: change.prayerName,
          prayerTime: change.prayerTime
        }).catch(() => {});
      });
    }

    return responseHelper.success(res, createdPrayerTimes, 'Prayer times updated successfully');
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    logger.error(`Bulk update prayer times error: ${error.message}`);
    return responseHelper.error(res, 'Failed to update prayer times', 500);
  }
};

/**
 * Send push notifications to subscribers when prayer time is updated
 * Only sends to users who:
 * 1. Have subscribed to the masjid with category "Prayer Times"
 * 2. Have prayer_times_notifications enabled in their settings (for authenticated users)
 * 3. Have valid FCM tokens
 * 4. Are NOT the imam/admin who made the change
 * @param {Object} masjid - Masjid object
 * @param {Object} prayerTime - PrayerTime object
 * @param {string} excludeUserId - User ID to exclude from notifications (the one who made the change)
 */
async function sendPrayerTimeNotifications(masjid, prayerTime, excludeUserId = null) {
  try {
    // Prayer time notifications always send - no debounce
    // Users want to receive 1 notification per prayer time change
    // Clear any debounce to ensure immediate notification
    notificationDebounceMap.delete(masjid.id);

    // Get all active subscriptions for this masjid (no category filter - one record per masjid)
    const subscriptions = await MasjidSubscription.findAll({
      where: {
        masjid_id: masjid.id,
        is_active: true,
        fcm_token: { [Op.ne]: null }
      },
      attributes: ['id', 'masjid_id', 'user_id', 'device_id', 'fcm_token'],
      include: [
        {
          model: User,
          as: 'user',
          required: false,
          attributes: ['id'],
          include: [
            {
              model: UserSettings,
              as: 'settings',
              required: false,
              attributes: ['prayer_times_notifications']
            }
          ]
        }
      ]
    });

    if (subscriptions.length === 0) {
      logger.info(`No active subscriptions found for masjid ${masjid.id}, category Prayer Times`);
      return;
    }

    // Get device settings for all anonymous subscriptions
    const anonymousDeviceIds = subscriptions
      .filter(sub => !sub.user_id && sub.device_id)
      .map(sub => sub.device_id);
    
    const deviceSettingsMap = {};
    if (anonymousDeviceIds.length > 0) {
      const deviceSettings = await DeviceSettings.findAll({
        where: { device_id: { [Op.in]: anonymousDeviceIds } }
      });
      deviceSettings.forEach(ds => {
        deviceSettingsMap[ds.device_id] = ds;
      });
    }

    // Get imams/admins for this masjid to exclude them if they made the change
    let imamAdminUserIds = [];
    if (excludeUserId) {
      const imamAdmins = await UserMasjid.findAll({
        where: {
          masjid_id: masjid.id,
          user_id: excludeUserId,
          role: { [Op.in]: ['imam', 'admin'] }
        }
      });
      // If the user who made the change is an imam/admin, exclude them
      if (imamAdmins.length > 0) {
        imamAdminUserIds.push(excludeUserId);
        logger.info(`Excluding imam/admin ${excludeUserId} (${imamAdmins[0].role}) from prayer time notifications for masjid ${masjid.id} (they made the change)`);
      } else {
        logger.info(`User ${excludeUserId} is not an imam/admin for masjid ${masjid.id}, will not exclude from notifications`);
      }
    }

    // Filter subscriptions:
    // 1. For authenticated users: check if prayer_times_notifications is enabled
    // 2. For anonymous users: check device settings
    // 3. Exclude imams/admins who made the change
    const validSubscriptions = subscriptions.filter(sub => {
      // Exclude the user who made the change if they're an imam/admin
      if (sub.user_id && imamAdminUserIds.includes(sub.user_id)) {
        logger.info(`Filtering out subscription ${sub.id} for user ${sub.user_id} (imam/admin who made the change)`);
        return false;
      }

      if (sub.user_id) {
        // Authenticated user - check user settings
        const settings = sub.user?.settings;
        // If no settings exist, default to true (as per UserSettings model default)
        return !settings || settings.prayer_times_notifications === true;
      } else if (sub.device_id) {
        // Anonymous user - check device settings
        const deviceSettings = deviceSettingsMap[sub.device_id];
        // If no settings exist, default to true (as per DeviceSettings model default)
        return !deviceSettings || deviceSettings.prayer_times_notifications === true;
      } else {
        // No user_id or device_id - skip
        return false;
      }
    });

    if (validSubscriptions.length === 0) {
      logger.info(`No valid subscriptions with prayer notifications enabled for masjid ${masjid.id}`);
      return;
    }

    logger.info(`Sending prayer time notifications to ${validSubscriptions.length} subscribers for masjid ${masjid.id}`);

    // Collect all FCM tokens
    const fcmTokens = validSubscriptions
      .map(sub => sub.fcm_token)
      .filter(token => token && token.trim() !== '');

    if (fcmTokens.length === 0) {
      logger.warn(`No valid FCM tokens found for masjid ${masjid.id}`);
      return;
    }

    // Format prayer time for display
    const prayerTimeStr = typeof prayerTime.prayer_time === 'string' 
      ? prayerTime.prayer_time 
      : prayerTime.prayer_time.toTimeString().slice(0, 5);

    // Prepare notification message
    const title = `Prayer Time Updated - ${masjid.name}`;
    const body = `${prayerTime.prayer_name} prayer time has been updated to ${prayerTimeStr}`;

    // Prepare notification data (all values must be strings for FCM)
    const effectiveDateStr = prayerTime.effective_date 
      ? (typeof prayerTime.effective_date === 'string' 
          ? prayerTime.effective_date 
          : prayerTime.effective_date.toISOString().split('T')[0])
      : '';
    
    const notificationData = {
      masjidId: String(masjid.id),
      masjidName: String(masjid.name),
      prayerName: String(prayerTime.prayer_name || ''),
      prayerTime: String(prayerTimeStr),
      effectiveDate: effectiveDateStr,
      category: 'Prayer Times',
      type: 'prayer_time_update'
    };

    logger.info(`Sending prayer time notification with data:`, {
      title,
      body,
      fcmTokensCount: fcmTokens.length,
      masjidId: masjid.id
    });

    // Send push notifications in batch
    const result = await pushNotificationService.sendBatchPushNotifications(
      fcmTokens,
      title,
      body,
      notificationData
    );

    if (result.success) {
      logger.info(`Prayer time push notifications sent: ${result.successful} successful, ${result.failed} failed for masjid ${masjid.id}`);
      
      // Log detailed error information for failed notifications
      if (result.failed > 0 && result.results) {
        const failedResults = result.results.filter(r => !r.success);
        logger.warn(`Prayer time notification failures for masjid ${masjid.id}:`, {
          totalFailed: failedResults.length,
          errors: failedResults.map(r => ({
            code: r.error?.code || 'unknown',
            message: r.error?.message || r.error || 'Unknown error'
          }))
        });
      }
      
      // Handle invalid tokens - deactivate subscriptions with invalid tokens
      if (result.results && result.results.length > 0) {
        const invalidTokens = result.results
          .filter(r => !r.success && (r.error?.code === 'messaging/invalid-registration-token' || r.error?.code === 'messaging/registration-token-not-registered'))
          .map(r => r.token);

        if (invalidTokens.length > 0) {
          await MasjidSubscription.update(
            { is_active: false },
            {
              where: {
                masjid_id: masjid.id,
                fcm_token: { [Op.in]: invalidTokens }
              }
            }
          );
          logger.info(`Deactivated ${invalidTokens.length} subscriptions with invalid FCM tokens`);
        }
      }
    } else {
      logger.error(`Failed to send prayer time push notifications for masjid ${masjid.id}: ${result.error}`, {
        masjidId: masjid.id,
        code: result.code,
        error: result.error,
        originalError: result.originalError
      });
    }
  } catch (error) {
    logger.error(`Error sending prayer time notifications for masjid ${masjid.id}: ${error.message}`, {
      masjidId: masjid.id,
      error: error.message,
      stack: error.stack
    });
    // Don't throw - we don't want to fail prayer time update if notification sending fails
  }
}

/**
 * Send push notifications for bulk prayer time updates
 * @param {Object} masjid - Masjid object
 * @param {Array} prayerTimes - Array of PrayerTime objects
 * @param {string} excludeUserId - User ID to exclude from notifications (the one who made the change)
 */
async function sendPrayerTimeBulkNotifications(masjid, prayerTimes, excludeUserId = null) {
  try {
    // Bulk updates always send notifications - no debounce
    // This ensures users always get notified about intentional bulk updates
    // Also clears any individual update debounce to allow immediate notification
    notificationDebounceMap.delete(masjid.id);

    // Get all active subscriptions for this masjid (no category filter - one record per masjid)
    const subscriptions = await MasjidSubscription.findAll({
      where: {
        masjid_id: masjid.id,
        is_active: true,
        fcm_token: { [Op.ne]: null }
      },
      attributes: ['id', 'masjid_id', 'user_id', 'device_id', 'fcm_token'],
      include: [
        {
          model: User,
          as: 'user',
          required: false,
          attributes: ['id'],
          include: [
            {
              model: UserSettings,
              as: 'settings',
              required: false,
              attributes: ['prayer_times_notifications']
            }
          ]
        }
      ]
    });

    if (subscriptions.length === 0) {
      logger.info(`No active subscriptions found for masjid ${masjid.id}, category Prayer Times`);
      return;
    }

    // Get device settings for all anonymous subscriptions
    const anonymousDeviceIds = subscriptions
      .filter(sub => !sub.user_id && sub.device_id)
      .map(sub => sub.device_id);
    
    const deviceSettingsMap = {};
    if (anonymousDeviceIds.length > 0) {
      const deviceSettings = await DeviceSettings.findAll({
        where: { device_id: { [Op.in]: anonymousDeviceIds } }
      });
      deviceSettings.forEach(ds => {
        deviceSettingsMap[ds.device_id] = ds;
      });
    }

    // Get imams/admins for this masjid to exclude them if they made the change
    let imamAdminUserIds = [];
    if (excludeUserId) {
      const imamAdmins = await UserMasjid.findAll({
        where: {
          masjid_id: masjid.id,
          user_id: excludeUserId,
          role: { [Op.in]: ['imam', 'admin'] }
        }
      });
      // If the user who made the change is an imam/admin, exclude them
      if (imamAdmins.length > 0) {
        imamAdminUserIds.push(excludeUserId);
        logger.info(`Excluding imam/admin ${excludeUserId} (${imamAdmins[0].role}) from bulk prayer time notifications for masjid ${masjid.id} (they made the change)`);
      } else {
        logger.info(`User ${excludeUserId} is not an imam/admin for masjid ${masjid.id}, will not exclude from bulk notifications`);
      }
    }

    // Filter subscriptions
    const validSubscriptions = subscriptions.filter(sub => {
      // Exclude the user who made the change if they're an imam/admin
      if (sub.user_id && imamAdminUserIds.includes(sub.user_id)) {
        logger.info(`Filtering out subscription ${sub.id} for user ${sub.user_id} (imam/admin who made the bulk change)`);
        return false;
      }

      if (sub.user_id) {
        // Authenticated user - check user settings
        const settings = sub.user?.settings;
        return !settings || settings.prayer_times_notifications === true;
      } else if (sub.device_id) {
        // Anonymous user - check device settings
        const deviceSettings = deviceSettingsMap[sub.device_id];
        return !deviceSettings || deviceSettings.prayer_times_notifications === true;
      } else {
        // No user_id or device_id - skip
        return false;
      }
    });

    if (validSubscriptions.length === 0) {
      logger.info(`No valid subscriptions with prayer notifications enabled for masjid ${masjid.id}`);
      return;
    }

    logger.info(`Sending bulk prayer time notifications to ${validSubscriptions.length} subscribers for masjid ${masjid.id}`);

    const fcmTokens = validSubscriptions
      .map(sub => sub.fcm_token)
      .filter(token => token && token.trim() !== '');

    if (fcmTokens.length === 0) {
      logger.warn(`No valid FCM tokens found for masjid ${masjid.id}`);
      return;
    }

    const title = `Prayer Times Updated - ${masjid.name}`;
    const body = `Prayer times have been updated for ${masjid.name}`;

    const notificationData = {
      masjidId: masjid.id,
      masjidName: masjid.name,
      category: 'Prayer Times',
      type: 'prayer_time_bulk_update',
      prayerTimesCount: prayerTimes.length.toString()
    };

    const result = await pushNotificationService.sendBatchPushNotifications(
      fcmTokens,
      title,
      body,
      notificationData
    );

    if (result.success) {
      logger.info(`Bulk prayer time push notifications sent: ${result.successful} successful, ${result.failed} failed`);
      
      if (result.results && result.results.length > 0) {
        const invalidTokens = result.results
          .filter(r => !r.success && (r.error?.code === 'messaging/invalid-registration-token' || r.error?.code === 'messaging/registration-token-not-registered'))
          .map(r => r.token);

        if (invalidTokens.length > 0) {
          await MasjidSubscription.update(
            { is_active: false },
            {
              where: {
                masjid_id: masjid.id,
                fcm_token: { [Op.in]: invalidTokens }
              }
            }
          );
          logger.info(`Deactivated ${invalidTokens.length} subscriptions with invalid FCM tokens`);
        }
      }
    } else {
      logger.error(`Failed to send bulk prayer time push notifications: ${result.error}`);
    }
  } catch (error) {
    logger.error(`Error sending bulk prayer time notifications: ${error.message}`);
  }
}

