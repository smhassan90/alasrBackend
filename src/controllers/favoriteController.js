const { UserFavorite, Masjid, AppConfig } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { generateDeviceId } = require('../utils/deviceId');

/**
 * Get app configuration (public endpoint)
 * @route GET /api/config/app
 */
exports.getAppConfig = async (req, res) => {
  try {
    const config = await AppConfig.findOne({
      where: { key: 'max_favorites_limit' }
    });

    const maxFavoritesLimit = config ? parseInt(config.value, 10) : 5;

    return responseHelper.success(res, {
      maxFavoritesLimit
    }, 'App configuration retrieved successfully');
  } catch (error) {
    logger.error(`Get app config error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve app configuration', 500);
  }
};

/**
 * Get user favorites
 * @route GET /api/users/favorites
 * Supports both authenticated users (user_id) and anonymous users (device_id)
 */
exports.getFavorites = async (req, res) => {
  try {
    const userId = req.userId || null;
    const { deviceId, platform, appVersion } = req.query;

    let whereClause = {};

    if (userId) {
      // Authenticated user
      whereClause.user_id = userId;
      whereClause.device_id = { [Op.is]: null };
    } else if (deviceId && platform) {
      // Anonymous user with device_id
      const uniqueDeviceId = generateDeviceId(deviceId, platform, appVersion || '');
      whereClause.device_id = uniqueDeviceId;
      whereClause.user_id = { [Op.is]: null };
    } else {
      return responseHelper.error(res, 'Authentication required or deviceId and platform must be provided', 400);
    }

    const favorites = await UserFavorite.findAll({
      where: whereClause,
      attributes: ['masjid_id'],
      order: [['created_at', 'DESC']]
    });

    const masjidIds = favorites.map(fav => fav.masjid_id);

    return responseHelper.success(res, masjidIds, 'Favorites retrieved successfully');
  } catch (error) {
    logger.error(`Get favorites error: ${error.message}`);
    if (error.message.includes('required')) {
      return responseHelper.error(res, error.message, 400);
    }
    return responseHelper.error(res, 'Failed to retrieve favorites', 500);
  }
};

/**
 * Add favorite masjid
 * @route POST /api/users/favorites
 * Supports both authenticated users (user_id) and anonymous users (device_id)
 */
exports.addFavorite = async (req, res) => {
  try {
    const { masjidId } = req.body;
    const userId = req.userId || null;
    const { deviceId, platform, appVersion } = req.body;

    // Validate masjidId
    if (!masjidId) {
      return responseHelper.error(res, 'masjidId is required', 400);
    }

    // Validate masjid exists
    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    // Get max favorites limit from config
    const config = await AppConfig.findOne({
      where: { key: 'max_favorites_limit' }
    });
    const maxFavoritesLimit = config ? parseInt(config.value, 10) : 5;

    // Determine user identifier
    let whereClause = {};
    let favoriteUserId = null;
    let favoriteDeviceId = null;

    if (userId) {
      // Authenticated user
      whereClause.user_id = userId;
      whereClause.device_id = { [Op.is]: null };
      favoriteUserId = userId;
    } else if (deviceId && platform) {
      // Anonymous user with device_id
      const uniqueDeviceId = generateDeviceId(deviceId, platform, appVersion || '');
      whereClause.device_id = uniqueDeviceId;
      whereClause.user_id = { [Op.is]: null };
      favoriteDeviceId = uniqueDeviceId;
    } else {
      return responseHelper.error(res, 'Authentication required or deviceId and platform must be provided', 400);
    }

    // Check if already favorited
    const existingFavorite = await UserFavorite.findOne({
      where: {
        ...whereClause,
        masjid_id: masjidId
      }
    });

    if (existingFavorite) {
      return responseHelper.error(res, 'Masjid is already in favorites', 409);
    }

    // Check if user has reached the limit
    const favoritesCount = await UserFavorite.count({
      where: whereClause
    });

    if (favoritesCount >= maxFavoritesLimit) {
      return responseHelper.error(res, `Maximum favorites limit (${maxFavoritesLimit}) reached`, 400);
    }

    // Create favorite
    await UserFavorite.create({
      user_id: favoriteUserId,
      device_id: favoriteDeviceId,
      masjid_id: masjidId
    });

    logger.info(`Favorite added: masjid ${masjidId}, user ${userId || favoriteDeviceId}`);

    return responseHelper.success(res, null, 'Masjid added to favorites successfully');
  } catch (error) {
    logger.error(`Add favorite error: ${error.message}`);
    if (error.message.includes('required') || error.message.includes('Masjid')) {
      return responseHelper.error(res, error.message, 400);
    }
    return responseHelper.error(res, 'Failed to add favorite', 500);
  }
};

/**
 * Remove favorite masjid
 * @route DELETE /api/users/favorites/:masjidId
 * Supports both authenticated users (user_id) and anonymous users (device_id)
 */
exports.removeFavorite = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const userId = req.userId || null;
    const { deviceId, platform, appVersion } = req.query;

    // Determine user identifier
    let whereClause = { masjid_id: masjidId };

    if (userId) {
      // Authenticated user
      whereClause.user_id = userId;
      whereClause.device_id = { [Op.is]: null };
    } else if (deviceId && platform) {
      // Anonymous user with device_id
      const uniqueDeviceId = generateDeviceId(deviceId, platform, appVersion || '');
      whereClause.device_id = uniqueDeviceId;
      whereClause.user_id = { [Op.is]: null };
    } else {
      return responseHelper.error(res, 'Authentication required or deviceId and platform must be provided', 400);
    }

    // Find and delete favorite
    const favorite = await UserFavorite.findOne({
      where: whereClause
    });

    if (!favorite) {
      return responseHelper.notFound(res, 'Masjid is not in favorites');
    }

    await favorite.destroy();

    logger.info(`Favorite removed: masjid ${masjidId}, user ${userId || deviceId}`);

    return responseHelper.success(res, null, 'Masjid removed from favorites successfully');
  } catch (error) {
    logger.error(`Remove favorite error: ${error.message}`);
    if (error.message.includes('required')) {
      return responseHelper.error(res, error.message, 400);
    }
    return responseHelper.error(res, 'Failed to remove favorite', 500);
  }
};

