const { Notification, Masjid, User, MasjidSubscription, UserSettings, DeviceSettings } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const pushNotificationService = require('../utils/pushNotificationService');
const { Op } = require('sequelize');

/**
 * Get all notifications for a masjid
 * @route GET /api/notifications/masjid/:masjidId
 */
exports.getNotificationsByMasjid = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const { page = 1, limit = 10, category } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { masjid_id: masjidId };

    if (category) {
      whereClause.category = category;
    }

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return responseHelper.paginated(res, notifications, {
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems: count
    }, 'Notifications retrieved successfully');
  } catch (error) {
    logger.error(`Get notifications error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve notifications', 500);
  }
};

/**
 * Get single notification
 * @route GET /api/notifications/:id
 */
exports.getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id, {
      include: [
        {
          model: Masjid,
          as: 'masjid',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!notification) {
      return responseHelper.notFound(res, 'Notification not found');
    }

    return responseHelper.success(res, notification, 'Notification retrieved successfully');
  } catch (error) {
    logger.error(`Get notification by ID error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve notification', 500);
  }
};

/**
 * Create notification
 * @route POST /api/notifications
 */
exports.createNotification = async (req, res) => {
  try {
    const { masjidId, title, description, category } = req.body;

    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    const notification = await Notification.create({
      masjid_id: masjidId,
      title,
      description,
      category,
      created_by: req.userId
    });

    // Fetch notification with creator information
    const notificationWithCreator = await Notification.findByPk(notification.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    logger.info(`Notification created for masjid ${masjidId} by ${req.userId}`);

    // Skip sending push notifications for "Prayer Times" category
    // Prayer time updates already send push notifications directly via sendPrayerTimeNotifications
    // Creating a Notification record for prayer times is just for record-keeping, not for sending duplicate notifications
    if (category === 'Prayer Times') {
      logger.info(`Skipping push notification for Prayer Times category - prayer time updates send notifications directly`);
      return responseHelper.success(res, notificationWithCreator, 'Notification created successfully (push notification skipped for Prayer Times)', 201);
    }

    // Send notifications to subscribers (async, don't wait)
    // In serverless environments, we need to ensure the promise is tracked
    // Use setImmediate to ensure the response is sent first, then process notifications
    setImmediate(() => {
      sendNotificationsToSubscribers(masjid, notification).catch(err => {
        logger.error(`Failed to send notifications to subscribers: ${err.message}`, {
          notificationId: notification.id,
          masjidId: masjidId,
          error: err.message,
          stack: err.stack
        });
      });
    });

    return responseHelper.success(res, notificationWithCreator, 'Notification created successfully', 201);
  } catch (error) {
    logger.error(`Create notification error: ${error.message}`);
    return responseHelper.error(res, 'Failed to create notification', 500);
  }
};

/**
 * Update notification
 * @route PUT /api/notifications/:id
 */
exports.updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category } = req.body;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return responseHelper.notFound(res, 'Notification not found');
    }

    if (title) notification.title = title;
    if (description) notification.description = description;
    if (category) notification.category = category;

    await notification.save();

    // Fetch notification with creator information
    const notificationWithCreator = await Notification.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    logger.info(`Notification ${id} updated by ${req.userId}`);

    return responseHelper.success(res, notificationWithCreator, 'Notification updated successfully');
  } catch (error) {
    logger.error(`Update notification error: ${error.message}`);
    return responseHelper.error(res, 'Failed to update notification', 500);
  }
};

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return responseHelper.notFound(res, 'Notification not found');
    }

    await notification.destroy();

    logger.info(`Notification ${id} deleted by ${req.userId}`);

    return responseHelper.success(res, null, 'Notification deleted successfully');
  } catch (error) {
    logger.error(`Delete notification error: ${error.message}`);
    return responseHelper.error(res, 'Failed to delete notification', 500);
  }
};

/**
 * Get recent notifications (last 10)
 * @route GET /api/notifications/masjid/:masjidId/recent
 */
exports.getRecentNotifications = async (req, res) => {
  try {
    const { masjidId } = req.params;

    const notifications = await Notification.findAll({
      where: { masjid_id: masjidId },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ],
      limit: 10,
      order: [['created_at', 'DESC']]
    });

    return responseHelper.success(res, notifications, 'Recent notifications retrieved successfully');
  } catch (error) {
    logger.error(`Get recent notifications error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve notifications', 500);
  }
};

/**
 * Send push notification directly (API key authentication - no login required)
 * @route POST /api/notifications/send-push
 */
exports.sendPushNotification = async (req, res) => {
  try {
    const { masjidId, category, title, body, data = {} } = req.body;

    // Validate masjid exists
    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    // Validate category
    const validCategories = ['Prayer Times', 'Donations', 'Events', 'General'];
    if (!validCategories.includes(category)) {
      return responseHelper.error(res, 'Invalid category. Must be one of: Prayer Times, Donations, Events, General', 400);
    }

    // Get all active subscriptions for this masjid (no category filter - one record per masjid)
    const subscriptions = await MasjidSubscription.findAll({
      where: {
        masjid_id: masjidId,
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
      logger.info(`No active subscriptions found for masjid ${masjidId}`);
      return responseHelper.success(res, {
        sent: 0,
        total: 0,
        message: 'No active subscriptions found for this masjid'
      }, 'No subscribers to notify');
    }

    // Map category to user settings field
    const categoryToSettingMap = {
      'Prayer Times': 'prayer_times_notifications',
      'Events': 'events_notifications',
      'Donations': 'donations_notifications',
      'General': 'general_notifications'
    };

    const settingField = categoryToSettingMap[category];

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

    // Filter subscriptions by user/device preferences for this category
    const validSubscriptions = subscriptions.filter(sub => {
      if (sub.user_id) {
        // Authenticated user - check user settings
        const settings = sub.user?.settings;
        // If no settings exist, default to true (as per UserSettings model default)
        return !settings || settings[settingField] === true;
      } else if (sub.device_id) {
        // Anonymous user - check device settings
        const deviceSettings = deviceSettingsMap[sub.device_id];
        // If no settings exist, default to true (as per DeviceSettings model default)
        return !deviceSettings || deviceSettings[settingField] === true;
      } else {
        // No user_id or device_id - skip
        return false;
      }
    });

    if (validSubscriptions.length === 0) {
      logger.info(`No valid subscriptions with ${category} notifications enabled for masjid ${masjidId}`);
      return responseHelper.success(res, {
        sent: 0,
        total: 0,
        message: `No subscribers with ${category} notifications enabled`
      }, 'No subscribers to notify');
    }

    // Collect all FCM tokens
    const fcmTokens = validSubscriptions
      .map(sub => sub.fcm_token)
      .filter(token => token && token.trim() !== '');

    if (fcmTokens.length === 0) {
      logger.warn(`No valid FCM tokens found for masjid ${masjidId}, category ${category}`);
      return responseHelper.success(res, {
        sent: 0,
        total: 0,
        message: 'No valid FCM tokens found'
      }, 'No valid tokens to send notifications');
    }

    // Prepare notification data
    const notificationData = {
      masjidId: masjidId,
      masjidName: masjid.name,
      category: category,
      type: 'masjid_notification',
      ...data
    };

    // Send push notifications in batch
    const result = await pushNotificationService.sendBatchPushNotifications(
      fcmTokens,
      title,
      body,
      notificationData
    );

    if (result.success) {
      logger.info(`Push notifications sent via API: ${result.successful} successful, ${result.failed} failed for masjid ${masjidId}`);
      
      // Log detailed error information for failed notifications
      if (result.results && result.results.length > 0) {
        const failedResults = result.results.filter(r => !r.success);
        if (failedResults.length > 0) {
          logger.warn(`Failed notification details for masjid ${masjidId}:`, {
            totalFailed: failedResults.length,
            errors: failedResults.map(r => ({
              token: r.token ? `${r.token.substring(0, 20)}...` : 'N/A',
              code: r.error?.code || 'unknown',
              message: r.error?.message || r.error || 'Unknown error'
            }))
          });
        }

        // Handle invalid tokens - deactivate subscriptions with invalid tokens
        const invalidTokens = result.results
          .filter(r => !r.success && (r.error?.code === 'messaging/invalid-registration-token' || r.error?.code === 'messaging/registration-token-not-registered'))
          .map(r => r.token);

        if (invalidTokens.length > 0) {
          await MasjidSubscription.update(
            { is_active: false },
            {
              where: {
                masjid_id: masjidId,
                fcm_token: { [Op.in]: invalidTokens }
              }
            }
          );
          logger.info(`Deactivated ${invalidTokens.length} subscriptions with invalid FCM tokens`);
        }
      }

      // Include error details in response if there are failures
      const responseData = {
        sent: result.successful,
        failed: result.failed,
        total: result.total,
        masjidId: masjidId,
        category: category
      };

      // Add error details if there are failures (for debugging)
      if (result.failed > 0 && result.results) {
        const failedResults = result.results.filter(r => !r.success);
        responseData.failureDetails = failedResults.map(r => ({
          code: r.error?.code || 'unknown',
          message: r.error?.message || r.error || 'Unknown error'
        }));
      }

      return responseHelper.success(res, responseData, `Push notifications sent: ${result.successful} successful, ${result.failed} failed`);
    } else {
      logger.error(`Failed to send push notifications: ${result.error}`, {
        masjidId,
        category,
        code: result.code,
        error: result.error
      });
      return responseHelper.error(res, `Failed to send push notifications: ${result.error}`, 500, {
        code: result.code,
        details: result.originalError
      });
    }
  } catch (error) {
    logger.error(`Send push notification error: ${error.message}`);
    return responseHelper.error(res, 'Failed to send push notification', 500);
  }
};

/**
 * Send push notifications to all subscribers for a masjid and category
 * @param {Object} masjid - Masjid object
 * @param {Object} notification - Notification object
 */
async function sendNotificationsToSubscribers(masjid, notification) {
  try {
    logger.info(`Starting notification sending for notification ${notification.id}, masjid ${notification.masjid_id}, category ${notification.category}`);
    
    // Get all active subscriptions for this masjid (no category filter - one record per masjid)
    logger.info(`Querying subscriptions for masjid ${notification.masjid_id}, category ${notification.category}`);
    let subscriptions;
    const queryStartTime = Date.now();
    
    // Add a 5 second timeout to the query (reduced from 10 for faster failure detection)
    const queryTimeout = 5000;
    const timeoutId = setTimeout(() => {
      logger.error(`QUERY TIMEOUT: Subscription query for masjid ${notification.masjid_id} exceeded ${queryTimeout}ms timeout`);
    }, queryTimeout);
    
    try {
      logger.info(`Executing subscription query for masjid ${notification.masjid_id}`);
      
      // Use a simpler query without nested includes to avoid hanging
      // We'll fetch user settings separately if needed
      subscriptions = await MasjidSubscription.findAll({
        where: {
          masjid_id: notification.masjid_id,
          is_active: true,
          fcm_token: { [Op.ne]: null }
        },
        include: [
          {
            model: User,
            as: 'user',
            required: false,
            attributes: ['id', 'name', 'email'] // Only get essential fields
          }
        ],
        // Add query timeout at Sequelize level
        timeout: queryTimeout,
        // Limit to prevent huge result sets
        limit: 1000
      });
      
      clearTimeout(timeoutId);
      const queryDuration = Date.now() - queryStartTime;
      logger.info(`✅ Subscription query completed in ${queryDuration}ms: found ${subscriptions.length} subscriptions for masjid ${notification.masjid_id}`);
      
      // Now fetch user settings separately for authenticated users (faster than nested include)
      const userIds = subscriptions
        .filter(sub => sub.user_id)
        .map(sub => sub.user_id)
        .filter((id, index, self) => self.indexOf(id) === index); // Unique IDs
      
      let userSettingsMap = {};
      if (userIds.length > 0) {
        try {
          const userSettings = await UserSettings.findAll({
            where: { user_id: { [Op.in]: userIds } },
            timeout: queryTimeout
          });
          userSettings.forEach(us => {
            userSettingsMap[us.user_id] = us;
          });
          logger.info(`Fetched user settings for ${userSettings.length} users`);
        } catch (settingsError) {
          logger.warn(`Failed to fetch user settings: ${settingsError.message} - continuing without settings`);
        }
      }
      
      // Attach settings to subscriptions
      subscriptions.forEach(sub => {
        if (sub.user_id && userSettingsMap[sub.user_id]) {
          if (!sub.user) sub.user = {};
          sub.user.settings = userSettingsMap[sub.user_id];
        }
      });
      
    } catch (queryError) {
      clearTimeout(timeoutId);
      const queryDuration = Date.now() - queryStartTime;
      logger.error(`❌ Error querying subscriptions for masjid ${notification.masjid_id} after ${queryDuration}ms: ${queryError.message}`, {
        error: queryError.message,
        code: queryError.code,
        name: queryError.name,
        stack: queryError.stack,
        notificationId: notification.id,
        masjidId: notification.masjid_id
      });
      // Don't throw - just return early to prevent blocking
      return;
    }

    logger.info(`Found ${subscriptions.length} active subscriptions with FCM tokens for masjid ${notification.masjid_id}`);

    if (subscriptions.length === 0) {
      logger.warn(`No active subscriptions with FCM tokens found for masjid ${notification.masjid_id} - notification cannot be sent`);
      return;
    }

    // Map category to user settings field
    const categoryToSettingMap = {
      'Prayer Times': 'prayer_times_notifications',
      'Events': 'events_notifications',
      'Donations': 'donations_notifications',
      'General': 'general_notifications'
    };

    const settingField = categoryToSettingMap[notification.category];
    
    if (!settingField) {
      logger.error(`Unknown category ${notification.category} for notification ${notification.id}`);
      return;
    }
    
    logger.info(`Using setting field: ${settingField} for category: ${notification.category}`);

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

    // Filter subscriptions by user/device preferences for this category
    logger.info(`Filtering ${subscriptions.length} subscriptions by preferences for category ${notification.category}`);
    const validSubscriptions = subscriptions.filter(sub => {
      if (sub.user_id) {
        // Authenticated user - check user settings
        const settings = sub.user?.settings;
        // If no settings exist, default to true (as per UserSettings model default)
        const isEnabled = !settings || settings[settingField] === true;
        if (!isEnabled) {
          logger.debug(`Subscription ${sub.id} filtered out: user ${sub.user_id} has ${settingField} = false`);
        }
        return isEnabled;
      } else if (sub.device_id) {
        // Anonymous user - check device settings
        const deviceSettings = deviceSettingsMap[sub.device_id];
        // If no settings exist, default to true (as per DeviceSettings model default)
        const isEnabled = !deviceSettings || deviceSettings[settingField] === true;
        if (!isEnabled) {
          logger.debug(`Subscription ${sub.id} filtered out: device ${sub.device_id} has ${settingField} = false`);
        }
        return isEnabled;
      } else {
        // No user_id or device_id - skip
        logger.debug(`Subscription ${sub.id} filtered out: no user_id or device_id`);
        return false;
      }
    });
    
    logger.info(`After filtering: ${validSubscriptions.length} valid subscriptions out of ${subscriptions.length} total`);

    if (validSubscriptions.length === 0) {
      logger.warn(`No valid subscriptions with ${notification.category} notifications enabled for masjid ${notification.masjid_id} (had ${subscriptions.length} total subscriptions)`);
      return;
    }

    logger.info(`Sending push notifications to ${validSubscriptions.length} subscribers for masjid ${notification.masjid_id}, category ${notification.category}`);

    // Collect all FCM tokens
    const fcmTokens = validSubscriptions
      .map(sub => sub.fcm_token)
      .filter(token => token && token.trim() !== '');

    if (fcmTokens.length === 0) {
      logger.warn(`No valid FCM tokens found for masjid ${notification.masjid_id}, category ${notification.category} (had ${validSubscriptions.length} valid subscriptions)`);
      return;
    }

    // Prepare notification data (all values must be strings for FCM)
    const notificationData = {
      notificationId: String(notification.id),
      masjidId: String(notification.masjid_id),
      masjidName: String(masjid.name),
      category: String(notification.category),
      type: 'masjid_notification'
    };

    logger.info(`Sending notification with data:`, {
      title: notification.title,
      description: notification.description.substring(0, 50) + (notification.description.length > 50 ? '...' : ''),
      fcmTokensCount: fcmTokens.length,
      masjidId: notification.masjid_id,
      category: notification.category
    });

    // Send push notifications in batch
    const result = await pushNotificationService.sendBatchPushNotifications(
      fcmTokens,
      notification.title,
      notification.description,
      notificationData
    );

    if (result.success) {
      logger.info(`Push notifications sent: ${result.successful} successful, ${result.failed} failed for masjid ${notification.masjid_id}, category ${notification.category}`);
      
      // Log detailed error information for failed notifications
      if (result.failed > 0 && result.results) {
        const failedResults = result.results.filter(r => !r.success);
        logger.warn(`Notification sending failures for masjid ${notification.masjid_id}:`, {
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
          // Deactivate subscriptions with invalid tokens
          await MasjidSubscription.update(
            { is_active: false },
            {
              where: {
                masjid_id: notification.masjid_id,
                fcm_token: { [Op.in]: invalidTokens }
              }
            }
          );
          logger.info(`Deactivated ${invalidTokens.length} subscriptions with invalid FCM tokens`);
        }
      }
    } else {
      logger.error(`Failed to send push notifications for masjid ${notification.masjid_id}, category ${notification.category}: ${result.error}`, {
        masjidId: notification.masjid_id,
        category: notification.category,
        code: result.code,
        error: result.error,
        originalError: result.originalError
      });
    }
  } catch (error) {
    logger.error(`Error sending push notifications to subscribers for notification ${notification.id}: ${error.message}`, {
      notificationId: notification.id,
      masjidId: notification.masjid_id,
      category: notification.category,
      error: error.message,
      stack: error.stack
    });
    // Don't throw - we don't want to fail notification creation if push notification sending fails
  }
}

