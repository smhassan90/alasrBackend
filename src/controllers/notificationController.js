const { Notification, Masjid, User } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
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

