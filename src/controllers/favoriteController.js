const { UserFavorite, Masjid, sequelize } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { generateDeviceId } = require('../utils/deviceId');
const { getMaxFavoritesLimit } = require('../utils/appConfigCache');
const { ensureAsrFiqhColumn } = require('../utils/ensureAsrFiqhColumn');
const { ensureAreaColumn } = require('../utils/ensureAreaColumn');

/**
 * Get app configuration (public endpoint)
 * @route GET /api/config/app
 */
exports.getAppConfig = async (req, res) => {
  try {
    const maxFavoritesLimit = await getMaxFavoritesLimit();

    res.set('Cache-Control', 'public, max-age=300');
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
    await ensureAsrFiqhColumn(sequelize);
    await ensureAreaColumn(sequelize);
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
      attributes: ['masjid_id', 'created_at'],
      include: [
        {
          model: Masjid,
          as: 'masjid',
          attributes: ['id', 'name', 'address', 'location', 'area', 'city', 'state', 'country', 'postal_code', 'contact_email', 'contact_phone', 'is_active', 'ask_imam_enabled', 'asr_fiqh', 'latitude', 'longitude']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Transform the response to include masjid details
    const favoriteMasajids = favorites.map(fav => ({
      masjid_id: fav.masjid_id,
      added_at: fav.created_at,
      masjid: fav.masjid
    }));

    return responseHelper.success(res, favoriteMasajids, 'Favorites retrieved successfully');
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

    const [masjid, maxFavoritesLimit, existingFavorite, favoritesCount] = await Promise.all([
      Masjid.findByPk(masjidId, { attributes: ['id'] }),
      getMaxFavoritesLimit(),
      UserFavorite.findOne({
        where: {
          ...whereClause,
          masjid_id: masjidId
        }
      }),
      UserFavorite.count({ where: whereClause })
    ]);

    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    if (existingFavorite) {
      return responseHelper.error(res, 'Masjid is already in favorites', 409);
    }

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

