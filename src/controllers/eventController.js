const { Event, Masjid, User, sequelize } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const activityLogService = require('../services/activityLogService');
const { uniqueById, upcomingEventWhere } = require('../utils/uniqueById');
const {
  ensureEventScheduleColumns,
  enrichEventsForMasjid,
  enrichEvent,
  loadPrayerTimeMap,
  normalizePrayerName,
} = require('../utils/eventScheduleService');

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function normalizeScheduleFields(body = {}) {
  const timeMode = body.timeMode || body.time_mode || 'fixed';
  const afterPrayer = normalizePrayerName(body.afterPrayer || body.after_prayer);
  const minutesRaw = body.minutesAfter ?? body.minutes_after;
  const minutesAfter =
    timeMode === 'after_prayer'
      ? minutesRaw === undefined || minutesRaw === null || minutesRaw === ''
        ? 0
        : Math.max(0, Math.min(180, parseInt(minutesRaw, 10) || 0))
      : null;

  if (timeMode === 'after_prayer') {
    return {
      time_mode: 'after_prayer',
      after_prayer: afterPrayer,
      minutes_after: minutesAfter,
      event_time: body.eventTime || body.event_time || '00:00',
    };
  }

  return {
    time_mode: 'fixed',
    after_prayer: null,
    minutes_after: null,
    event_time: body.eventTime || body.event_time,
  };
}

/**
 * Get all events for a masjid
 * @route GET /api/events/masjid/:masjidId
 */
exports.getEventsByMasjid = async (req, res) => {
  try {
    await ensureEventScheduleColumns(sequelize);
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
          attributes: ['id', 'name', 'email'],
          duplicating: false
        }
      ],
      distinct: true,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['event_date', 'DESC'], ['event_time', 'DESC']]
    });

    const enriched = await enrichEventsForMasjid(uniqueById(events), masjidId, todayIso());

    return responseHelper.paginated(res, enriched, {
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
    await ensureEventScheduleColumns(sequelize);
    const { masjidId, name, description, eventType, dayOfWeek, eventDate, location } = req.body;
    const schedule = normalizeScheduleFields(req.body);

    if (schedule.time_mode === 'after_prayer' && !schedule.after_prayer) {
      return responseHelper.error(res, 'Prayer name is required for after-prayer events', 400);
    }
    if (schedule.time_mode === 'fixed' && !schedule.event_time) {
      return responseHelper.error(res, 'Event time is required', 400);
    }

    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    const event = await Event.create({
      masjid_id: masjidId,
      name,
      description,
      event_type: eventType || 'one_time',
      day_of_week: dayOfWeek !== undefined ? dayOfWeek : null,
      event_date: eventType === 'recurring' ? null : eventDate,
      event_time: schedule.event_time,
      time_mode: schedule.time_mode,
      after_prayer: schedule.after_prayer,
      minutes_after: schedule.minutes_after,
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

    await activityLogService.logEventCreated({
      masjidId,
      userId: req.userId,
      actorName: req.user?.name || eventWithCreator?.creator?.name,
      eventName: name
    });

    const prayerMap = await loadPrayerTimeMap(masjidId, todayIso());
    return responseHelper.success(
      res,
      enrichEvent(eventWithCreator, prayerMap),
      'Event created successfully',
      201,
    );
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
    await ensureEventScheduleColumns(sequelize);
    const { id } = req.params;
    const { name, description, eventType, dayOfWeek, eventDate, location } = req.body;

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
    if (eventType) event.event_type = eventType;
    if (dayOfWeek !== undefined) event.day_of_week = dayOfWeek;
    if (eventType === 'recurring') {
      event.event_date = null;
    } else if (eventDate) {
      event.event_date = eventDate;
    }
    if (location !== undefined) event.location = location;

    if (
      req.body.timeMode !== undefined ||
      req.body.time_mode !== undefined ||
      req.body.afterPrayer !== undefined ||
      req.body.after_prayer !== undefined ||
      req.body.minutesAfter !== undefined ||
      req.body.minutes_after !== undefined ||
      req.body.eventTime !== undefined
    ) {
      const schedule = normalizeScheduleFields({
        timeMode: req.body.timeMode || req.body.time_mode || event.time_mode || 'fixed',
        afterPrayer: req.body.afterPrayer ?? req.body.after_prayer ?? event.after_prayer,
        minutesAfter: req.body.minutesAfter ?? req.body.minutes_after ?? event.minutes_after,
        eventTime: req.body.eventTime ?? req.body.event_time ?? event.event_time,
      });
      event.time_mode = schedule.time_mode;
      event.after_prayer = schedule.after_prayer;
      event.minutes_after = schedule.minutes_after;
      if (schedule.event_time) {
        event.event_time = schedule.event_time;
      }
    }

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

    const prayerMap = await loadPrayerTimeMap(event.masjid_id, todayIso());
    return responseHelper.success(
      res,
      enrichEvent(eventWithCreator, prayerMap),
      'Event updated successfully',
    );
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
    await ensureEventScheduleColumns(sequelize);
    const { masjidId } = req.params;
    const today = todayIso();

    const events = await Event.findAll({
      where: upcomingEventWhere(masjidId, today),
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name'],
          duplicating: false
        }
      ],
      subQuery: false,
      order: [['event_date', 'ASC'], ['event_time', 'ASC']],
      limit: 20
    });

    const enriched = await enrichEventsForMasjid(uniqueById(events), masjidId, today);
    return responseHelper.success(res, enriched, 'Upcoming events retrieved successfully');
  } catch (error) {
    logger.error(`Get upcoming events error: ${error.message}`);
    return responseHelper.success(res, [], 'Upcoming events retrieved successfully');
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
        event_type: 'one_time',
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

