const { MasjidSubscription, Masjid, User, UserSettings, Sequelize } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Subscribe to masjid notifications
 * @route POST /api/subscriptions
 * Supports both authenticated users (user_id) and anonymous users (device_id)
 * Requires fcm_token for push notifications
 * Creates/updates ONE record per masjid (category preferences are stored in user_settings)
 */
exports.subscribe = async (req, res) => {
  try {
    const { masjidId, deviceId, fcmToken } = req.body;
    const userId = req.userId || null; // Optional - can be null for anonymous users

    // Validate masjid exists
    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    // FCM token is required for push notifications
    if (!fcmToken) {
      return responseHelper.error(res, 'FCM token is required for push notifications', 400);
    }

    // Build where clause for checking existing subscription (one record per masjid, no category)
    const whereClause = {
      masjid_id: masjidId
    };

    // Priority: If deviceId is explicitly provided in body, use it (for anonymous users)
    // Otherwise, use userId from authentication token
    if (deviceId) {
      // For anonymous users, match device_id and ensure user_id is null
      whereClause.device_id = deviceId;
      whereClause.user_id = { [Op.is]: null };
    } else if (userId) {
      // For authenticated users, use userId
      whereClause.user_id = userId;
    } else {
      // Neither deviceId nor userId provided
      return responseHelper.error(res, 'Either user authentication or deviceId is required', 400);
    }

    // Check if subscription already exists
    let subscription = await MasjidSubscription.findOne({ where: whereClause });

    if (subscription) {
      // Update FCM token and reactivate if inactive
      subscription.fcm_token = fcmToken;
      subscription.is_active = true;
      await subscription.save();
      logger.info(`Subscription updated for masjid ${masjidId}`);
      return responseHelper.success(res, subscription, subscription.is_active ? 'Subscription updated successfully' : 'Subscription reactivated successfully');
    }

    // Create new subscription (no category - preferences stored in user_settings)
    // Use deviceId if provided, otherwise use userId
    subscription = await MasjidSubscription.create({
      masjid_id: masjidId,
      user_id: deviceId ? null : userId, // If deviceId provided, user_id should be null
      device_id: deviceId || null,
      fcm_token: fcmToken,
      category: null, // Category is deprecated - preferences stored in user_settings
      is_active: true
    });

    logger.info(`Subscription created for masjid ${masjidId}`);

    return responseHelper.success(res, subscription, 'Subscribed successfully', 201);
  } catch (error) {
    logger.error(`Subscribe error: ${error.message}`);
    return responseHelper.error(res, 'Failed to subscribe', 500);
  }
};

/**
 * Unsubscribe from masjid notifications
 * @route DELETE /api/subscriptions
 * Deactivates ONE record per masjid (category preferences remain in user_settings)
 */
exports.unsubscribe = async (req, res) => {
  try {
    const { masjidId, deviceId } = req.body;
    const userId = req.userId || null;

    // Validate masjidId
    if (!masjidId) {
      return responseHelper.error(res, 'Masjid ID is required', 400);
    }

    // Build where clause (one record per masjid, no category filter)
    const whereClause = {
      masjid_id: masjidId
    };

    // Priority: If deviceId is explicitly provided in body, use it (for anonymous users)
    // Otherwise, use userId from authentication token
    if (deviceId) {
      // For anonymous users, match device_id and ensure user_id is null
      whereClause.device_id = deviceId;
      whereClause.user_id = { [Op.is]: null };
    } else if (userId) {
      // For authenticated users, use userId
      whereClause.user_id = userId;
    } else {
      // Neither deviceId nor userId provided
      return responseHelper.error(res, 'Either user authentication or deviceId is required', 400);
    }

    logger.info(`Unsubscribe query - masjidId: ${masjidId}, deviceId: ${deviceId || 'N/A'}, userId: ${userId || 'N/A'}`);

    // Try to find subscription - don't filter by is_active so we can find inactive ones too
    const subscription = await MasjidSubscription.findOne({ 
      where: whereClause
    });

    if (!subscription) {
      // Try to find any subscription for this masjid and device to help debug
      const debugSub = await MasjidSubscription.findOne({
        where: {
          masjid_id: masjidId,
          device_id: deviceId || { [Op.ne]: null }
        }
      });
      
      logger.warn(`Subscription not found. Debug - Found subscription: ${debugSub ? 'YES' : 'NO'}, masjidId: ${masjidId}, deviceId: ${deviceId || 'N/A'}, userId: ${userId || 'N/A'}`);
      
      return responseHelper.notFound(res, 'Subscription not found');
    }

    // Check if already inactive
    if (!subscription.is_active) {
      logger.info(`Subscription already inactive for masjid ${masjidId}`);
      return responseHelper.success(res, null, 'Already unsubscribed');
    }

    // Deactivate subscription instead of deleting
    subscription.is_active = false;
    await subscription.save();

    logger.info(`Subscription deactivated for masjid ${masjidId}, subscription ID: ${subscription.id}`);

    return responseHelper.success(res, null, 'Unsubscribed successfully');
  } catch (error) {
    logger.error(`Unsubscribe error: ${error.message}`, { error: error.stack, body: req.body });
    return responseHelper.error(res, 'Failed to unsubscribe', 500);
  }
};

/**
 * Get user's subscriptions
 * @route GET /api/subscriptions
 */
exports.getSubscriptions = async (req, res) => {
  try {
    const userId = req.userId || null;
    const { deviceId } = req.query;

    // At least one identifier must be provided
    if (!userId && !deviceId) {
      return responseHelper.error(res, 'Either user authentication or deviceId is required', 400);
    }

    // Build where clause
    const whereClause = {
      is_active: true
    };

    if (userId) {
      whereClause.user_id = userId;
    } else if (deviceId) {
      whereClause.device_id = deviceId;
      whereClause.user_id = { [Op.is]: null };
    }

    const subscriptions = await MasjidSubscription.findAll({
      where: whereClause,
      include: [
        {
          model: Masjid,
          as: 'masjid',
          attributes: ['id', 'name', 'location', 'city']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return responseHelper.success(res, subscriptions, 'Subscriptions retrieved successfully');
  } catch (error) {
    logger.error(`Get subscriptions error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve subscriptions', 500);
  }
};

/**
 * Get subscriptions for a specific masjid
 * @route GET /api/subscriptions/masjid/:masjidId
 * Note: Category filter removed - one subscription per masjid, category preferences in user_settings
 */
exports.getMasjidSubscriptions = async (req, res) => {
  try {
    const { masjidId } = req.params;

    const subscriptions = await MasjidSubscription.findAll({
      where: {
        masjid_id: masjidId,
        is_active: true
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return responseHelper.success(res, subscriptions, 'Subscriptions retrieved successfully');
  } catch (error) {
    logger.error(`Get masjid subscriptions error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve subscriptions', 500);
  }
};

/**
 * Register device with FCM token
 * Updates FCM token for all existing subscriptions for this device
 * @route POST /api/subscriptions/register-device
 */
exports.registerDevice = async (req, res) => {
  try {
    const { deviceId, fcmToken } = req.body;

    if (!deviceId || !fcmToken) {
      return responseHelper.error(res, 'Device ID and FCM token are required', 400);
    }

    // Update FCM token for all existing subscriptions for this device
    // Only update anonymous device subscriptions (where user_id is null)
    const updatedCount = await MasjidSubscription.update(
      { fcm_token: fcmToken },
      {
        where: {
          device_id: deviceId,
          user_id: null
        }
      }
    );

    logger.info(`Device ${deviceId} registered/updated with FCM token. Updated ${updatedCount[0]} subscriptions.`);

    return responseHelper.success(
      res,
      {
        deviceId,
        subscriptionsUpdated: updatedCount[0]
      },
      'Device registered successfully'
    );
  } catch (error) {
    logger.error(`Register device error: ${error.message}`, { error: error.stack });
    return responseHelper.error(res, `Failed to register device: ${error.message}`, 500);
  }
};

/**
 * Toggle subscribe/unsubscribe to masjid notifications
 * @route POST /api/subscriptions/masjid/:masjidId/toggle
 * Creates/updates ONE record per masjid (category preferences stored in user_settings)
 */
exports.toggleMasjidSubscription = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const { fcmToken } = req.body;
    const userId = req.userId || null;

    // Validate masjid exists
    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    // FCM token is required for push notifications
    if (!fcmToken) {
      return responseHelper.error(res, 'FCM token is required for push notifications', 400);
    }

    // If user is not authenticated, deviceId is required
    if (!userId && !req.body.deviceId) {
      return responseHelper.error(res, 'Device ID is required for anonymous users', 400);
    }

    // Build where clause for checking existing subscription (one record per masjid)
    const subscriptionWhere = {
      masjid_id: masjidId
    };
    
    if (userId) {
      subscriptionWhere.user_id = userId;
    } else {
      subscriptionWhere.user_id = { [Op.is]: null };
      if (req.body.deviceId) {
        subscriptionWhere.device_id = req.body.deviceId;
      }
    }
    
    // Check if subscription already exists
    let subscription = await MasjidSubscription.findOne({
      where: subscriptionWhere
    });

    if (subscription && subscription.is_active) {
      // Unsubscribe: Deactivate subscription
      subscription.is_active = false;
      await subscription.save();

      logger.info(`Unsubscribed from masjid ${masjidId} for user ${userId || 'anonymous'}`);
      return responseHelper.success(res, { subscribed: false }, 'Unsubscribed successfully');
    } else {
      // Subscribe: Create or reactivate subscription
      if (subscription) {
        // Reactivate and update FCM token
        subscription.is_active = true;
        subscription.fcm_token = fcmToken;
        await subscription.save();
      } else {
        // Create new subscription (no category - preferences stored in user_settings)
        subscription = await MasjidSubscription.create({
          masjid_id: masjidId,
          user_id: userId,
          device_id: userId ? null : (req.body.deviceId || null),
          fcm_token: fcmToken,
          category: null, // Category is deprecated - preferences stored in user_settings
          is_active: true
        });
      }

      logger.info(`Subscribed to masjid ${masjidId}`);
      return responseHelper.success(res, {
        subscribed: true,
        subscription: subscription
      }, 'Subscribed successfully');
    }
  } catch (error) {
    logger.error(`Toggle masjid subscription error: ${error.message}`);
    return responseHelper.error(res, 'Failed to toggle subscription', 500);
  }
};

