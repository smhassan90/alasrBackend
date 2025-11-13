const { MasjidSubscription, Masjid, User } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Subscribe to masjid notifications for a specific category
 * @route POST /api/subscriptions
 * Supports both authenticated users (user_id) and anonymous users (device_id)
 * Requires fcm_token for push notifications
 */
exports.subscribe = async (req, res) => {
  try {
    const { masjidId, category, deviceId, fcmToken } = req.body;
    const userId = req.userId || null; // Optional - can be null for anonymous users

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

    // FCM token is required for push notifications
    if (!fcmToken) {
      return responseHelper.error(res, 'FCM token is required for push notifications', 400);
    }

    // At least one identifier must be provided
    if (!userId && !deviceId) {
      return responseHelper.error(res, 'Either user authentication or deviceId is required', 400);
    }

    // Build where clause for checking existing subscription
    const whereClause = {
      masjid_id: masjidId,
      category
    };

    if (userId) {
      whereClause.user_id = userId;
    } else if (deviceId) {
      whereClause.device_id = deviceId;
      whereClause.user_id = { [Op.is]: null };
    }

    // Check if subscription already exists
    let subscription = await MasjidSubscription.findOne({ where: whereClause });

    if (subscription) {
      // Update FCM token and reactivate if inactive
      subscription.fcm_token = fcmToken;
      subscription.is_active = true;
      await subscription.save();
      logger.info(`Subscription updated for masjid ${masjidId}, category ${category}`);
      return responseHelper.success(res, subscription, subscription.is_active ? 'Subscription updated successfully' : 'Subscription reactivated successfully');
    }

    // Create new subscription
    subscription = await MasjidSubscription.create({
      masjid_id: masjidId,
      user_id: userId,
      device_id: deviceId || null,
      fcm_token: fcmToken,
      category,
      is_active: true
    });

    logger.info(`Subscription created for masjid ${masjidId}, category ${category}`);

    return responseHelper.success(res, subscription, 'Subscribed successfully', 201);
  } catch (error) {
    logger.error(`Subscribe error: ${error.message}`);
    return responseHelper.error(res, 'Failed to subscribe', 500);
  }
};

/**
 * Unsubscribe from masjid notifications for a specific category
 * @route DELETE /api/subscriptions
 */
exports.unsubscribe = async (req, res) => {
  try {
    const { masjidId, category, deviceId } = req.body;
    const userId = req.userId || null;

    // At least one identifier must be provided
    if (!userId && !deviceId) {
      return responseHelper.error(res, 'Either user authentication or deviceId is required', 400);
    }

    // Build where clause
    const whereClause = {
      masjid_id: masjidId,
      category
    };

    if (userId) {
      whereClause.user_id = userId;
    } else if (deviceId) {
      whereClause.device_id = deviceId;
      whereClause.user_id = { [Op.is]: null };
    }

    const subscription = await MasjidSubscription.findOne({ where: whereClause });

    if (!subscription) {
      return responseHelper.notFound(res, 'Subscription not found');
    }

    // Deactivate subscription instead of deleting
    subscription.is_active = false;
    await subscription.save();

    logger.info(`Subscription deactivated for masjid ${masjidId}, category ${category}`);

    return responseHelper.success(res, null, 'Unsubscribed successfully');
  } catch (error) {
    logger.error(`Unsubscribe error: ${error.message}`);
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
 */
exports.getMasjidSubscriptions = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const { category } = req.query;

    const whereClause = {
      masjid_id: masjidId,
      is_active: true
    };

    if (category) {
      whereClause.category = category;
    }

    const subscriptions = await MasjidSubscription.findAll({
      where: whereClause,
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
    const updatedCount = await MasjidSubscription.update(
      { fcm_token: fcmToken },
      {
        where: {
          device_id: deviceId,
          user_id: { [Op.is]: null } // Only update anonymous device subscriptions
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
    logger.error(`Register device error: ${error.message}`);
    return responseHelper.error(res, 'Failed to register device', 500);
  }
};

