const { PrayerTime, Masjid, User, MasjidSubscription, UserSettings, DeviceSettings, sequelize } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const pushNotificationService = require('../utils/pushNotificationService');
const { Op } = require('sequelize');

/**
 * Get all prayer times for a masjid
 * @route GET /api/prayer-times/masjid/:masjidId
 */
exports.getPrayerTimesByMasjid = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const { effectiveDate } = req.query;

    const whereClause = { masjid_id: masjidId };
    
    if (effectiveDate) {
      whereClause.effective_date = effectiveDate;
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
        [sequelize.literal("FIELD(prayer_name, 'Fajr', 'Dhuhr', 'Jummah', 'Asr', 'Maghrib', 'Isha')")]
      ]
    });

    return responseHelper.success(res, prayerTimes, 'Prayer times retrieved successfully');
  } catch (error) {
    logger.error(`Get prayer times error: ${error.message}`, { error: error.stack, masjidId });
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
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const prayerTimes = await PrayerTime.findAll({
      where: {
        masjid_id: masjidId,
        effective_date: {
          [Op.lte]: today
        }
      },
      order: [
        ['effective_date', 'DESC'],
        [sequelize.literal("FIELD(prayer_name, 'Fajr', 'Dhuhr', 'Jummah', 'Asr', 'Maghrib', 'Isha')")]
      ]
    });

    // Get the most recent prayer time for each prayer
    const latestPrayerTimes = {};
    prayerTimes.forEach(pt => {
      if (!latestPrayerTimes[pt.prayer_name]) {
        latestPrayerTimes[pt.prayer_name] = pt;
      }
    });

    const result = Object.values(latestPrayerTimes);

    return responseHelper.success(res, result, 'Today\'s prayer times retrieved successfully');
  } catch (error) {
    logger.error(`Get today's prayer times error: ${error.message}`, { error: error.stack, masjidId });
    return responseHelper.error(res, `Failed to retrieve prayer times: ${error.message}`, 500);
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
    if (timeChanged) {
      sendPrayerTimeNotifications(masjid, prayerTimeRecord).catch(err => {
        logger.error(`Failed to send prayer time notifications: ${err.message}`);
      });
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
    if (timeChanged) {
      sendPrayerTimeNotifications(prayerTimeRecord.masjid, prayerTimeRecord).catch(err => {
        logger.error(`Failed to send prayer time notifications: ${err.message}`);
      });
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

    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      await transaction.rollback();
      return responseHelper.notFound(res, 'Masjid not found');
    }

    const date = effectiveDate || new Date().toISOString().split('T')[0];

    const createdPrayerTimes = [];
    let hasChanges = false;

    for (const pt of prayerTimes) {
      // Check if exists
      const existing = await PrayerTime.findOne({
        where: {
          masjid_id: masjidId,
          prayer_name: pt.prayerName,
          effective_date: date
        },
        transaction
      });

      if (existing) {
        // Check if prayer time actually changed
        if (existing.prayer_time !== pt.prayerTime) {
          hasChanges = true;
        }
        // Update
        existing.prayer_time = pt.prayerTime;
        existing.updated_by = req.userId;
        if (notifyUsers !== undefined) {
          existing.notify_users = notifyUsers;
        }
        await existing.save({ transaction });
        createdPrayerTimes.push(existing);
      } else {
        // Create new - always notify for new prayer times
        hasChanges = true;
        const newPrayerTime = await PrayerTime.create({
          masjid_id: masjidId,
          prayer_name: pt.prayerName,
          prayer_time: pt.prayerTime,
          effective_date: date,
          updated_by: req.userId,
          notify_users: notifyUsers || false
        }, { transaction });
        createdPrayerTimes.push(newPrayerTime);
      }
    }

    await transaction.commit();

    logger.info(`Bulk prayer times updated for masjid ${masjidId} by ${req.userId}`);

    // Send notifications automatically when prayer times change (only to subscribed users)
    // The sendPrayerTimeBulkNotifications function already filters by user preferences
    if (hasChanges) {
      // Get masjid info for notification
      const masjidInfo = await Masjid.findByPk(masjidId);
      sendPrayerTimeBulkNotifications(masjidInfo, createdPrayerTimes).catch(err => {
        logger.error(`Failed to send bulk prayer time notifications: ${err.message}`);
      });
    }

    return responseHelper.success(res, createdPrayerTimes, 'Prayer times updated successfully');
  } catch (error) {
    await transaction.rollback();
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
 */
async function sendPrayerTimeNotifications(masjid, prayerTime) {
  try {
    // Get all active subscriptions for this masjid (no category filter - one record per masjid)
    const subscriptions = await MasjidSubscription.findAll({
      where: {
        masjid_id: masjid.id,
        is_active: true,
        fcm_token: { [Op.ne]: null }
      },
      include: [
        {
          model: User,
          as: 'user',
          required: false,
          include: [
            {
              model: UserSettings,
              as: 'settings',
              required: false
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

    // Filter subscriptions:
    // 1. For authenticated users: check if prayer_times_notifications is enabled
    // 2. For anonymous users: check device settings
    const validSubscriptions = subscriptions.filter(sub => {
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

    // Prepare notification data
    const notificationData = {
      masjidId: masjid.id,
      masjidName: masjid.name,
      prayerName: prayerTime.prayer_name,
      prayerTime: prayerTimeStr,
      effectiveDate: prayerTime.effective_date,
      category: 'Prayer Times',
      type: 'prayer_time_update'
    };

    // Send push notifications in batch
    const result = await pushNotificationService.sendBatchPushNotifications(
      fcmTokens,
      title,
      body,
      notificationData
    );

    if (result.success) {
      logger.info(`Prayer time push notifications sent: ${result.successful} successful, ${result.failed} failed for masjid ${masjid.id}`);
      
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
      logger.error(`Failed to send prayer time push notifications: ${result.error}`);
    }
  } catch (error) {
    logger.error(`Error sending prayer time notifications: ${error.message}`);
    // Don't throw - we don't want to fail prayer time update if notification sending fails
  }
}

/**
 * Send push notifications for bulk prayer time updates
 */
async function sendPrayerTimeBulkNotifications(masjid, prayerTimes) {
  try {
    // Get all active subscriptions for this masjid (no category filter - one record per masjid)
    const subscriptions = await MasjidSubscription.findAll({
      where: {
        masjid_id: masjid.id,
        is_active: true,
        fcm_token: { [Op.ne]: null }
      },
      include: [
        {
          model: User,
          as: 'user',
          required: false,
          include: [
            {
              model: UserSettings,
              as: 'settings',
              required: false
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

    // Filter subscriptions
    const validSubscriptions = subscriptions.filter(sub => {
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

