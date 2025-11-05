const { Event, Masjid, User } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Get all events for a masjid
 * @route GET /api/events/masjid/:masjidId
 */
exports.getEventsByMasjid = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { 
      masjid_id: masjidId,
      status: 'active'  // Only get active events (not deleted)
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: events } = await Event.findAndCountAll({
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
      order: [['event_date', 'DESC'], ['event_time', 'DESC']]
    });

    return responseHelper.paginated(res, events, {
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems: count
    }, 'Events retrieved successfully');
  } catch (error) {
    logger.error(`Get events error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve events', 500);
  }
};

/**
 * Get single event
 * @route GET /api/events/:id
 */
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findOne({
      where: {
        id: id,
        status: 'active'  // Only get active events (not deleted)
      },
      include: [
        {
          model: Masjid,
          as: 'masjid',
          attributes: ['id', 'name', 'location']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!event) {
      return responseHelper.notFound(res, 'Event not found');
    }

    return responseHelper.success(res, event, 'Event retrieved successfully');
  } catch (error) {
    logger.error(`Get event by ID error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve event', 500);
  }
};

/**
 * Create event
 * @route POST /api/events
 */
exports.createEvent = async (req, res) => {
  try {
    const { masjidId, name, description, eventDate, eventTime, location } = req.body;

    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    const event = await Event.create({
      masjid_id: masjidId,
      name,
      description,
      event_date: eventDate,
      event_time: eventTime,
      location,
      created_by: req.userId
    });

    // Fetch event with creator information
    const eventWithCreator = await Event.findByPk(event.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    logger.info(`Event created for masjid ${masjidId} by ${req.userId}`);

    return responseHelper.success(res, eventWithCreator, 'Event created successfully', 201);
  } catch (error) {
    logger.error(`Create event error: ${error.message}`);
    return responseHelper.error(res, 'Failed to create event', 500);
  }
};

/**
 * Update event
 * @route PUT /api/events/:id
 */
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, eventDate, eventTime, location } = req.body;

    const event = await Event.findByPk(id);
    if (!event) {
      return responseHelper.notFound(res, 'Event not found');
    }

    // Prevent updating deleted events
    if (event.status === 'deleted') {
      return responseHelper.error(res, 'Cannot update a deleted event', 400);
    }

    if (name) event.name = name;
    if (description !== undefined) event.description = description;
    if (eventDate) event.event_date = eventDate;
    if (eventTime) event.event_time = eventTime;
    if (location !== undefined) event.location = location;

    await event.save();

    // Fetch event with creator information
    const eventWithCreator = await Event.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    logger.info(`Event ${id} updated by ${req.userId}`);

    return responseHelper.success(res, eventWithCreator, 'Event updated successfully');
  } catch (error) {
    logger.error(`Update event error: ${error.message}`);
    return responseHelper.error(res, 'Failed to update event', 500);
  }
};

/**
 * Delete event (soft delete - changes status to 'deleted')
 * @route DELETE /api/events/:id
 */
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await Event.findByPk(id);
    if (!event) {
      return responseHelper.notFound(res, 'Event not found');
    }

    // Check if event is already deleted
    if (event.status === 'deleted') {
      return responseHelper.error(res, 'Event is already deleted', 400);
    }

    // Soft delete: change status to 'deleted' instead of destroying
    event.status = 'deleted';
    await event.save();

    logger.info(`Event ${id} soft deleted by ${req.userId}`);

    return responseHelper.success(res, null, 'Event deleted successfully');
  } catch (error) {
    logger.error(`Delete event error: ${error.message}`);
    return responseHelper.error(res, 'Failed to delete event', 500);
  }
};

/**
 * Get upcoming events
 * @route GET /api/events/masjid/:masjidId/upcoming
 */
exports.getUpcomingEvents = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const events = await Event.findAll({
      where: {
        masjid_id: masjidId,
        status: 'active',  // Only get active events (not deleted)
        event_date: {
          [Op.gte]: today
        }
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ],
      order: [['event_date', 'ASC'], ['event_time', 'ASC']],
      limit: 20
    });

    return responseHelper.success(res, events, 'Upcoming events retrieved successfully');
  } catch (error) {
    logger.error(`Get upcoming events error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve upcoming events', 500);
  }
};

/**
 * Get past events
 * @route GET /api/events/masjid/:masjidId/past
 */
exports.getPastEvents = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const today = new Date().toISOString().split('T')[0];

    const { count, rows: events } = await Event.findAndCountAll({
      where: {
        masjid_id: masjidId,
        status: 'active',  // Only get active events (not deleted)
        event_date: {
          [Op.lt]: today
        }
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['event_date', 'DESC'], ['event_time', 'DESC']]
    });

    return responseHelper.paginated(res, events, {
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems: count
    }, 'Past events retrieved successfully');
  } catch (error) {
    logger.error(`Get past events error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve past events', 500);
  }
};

