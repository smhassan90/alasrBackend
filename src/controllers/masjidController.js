const { Masjid, UserMasjid, User, Question, Event, sequelize } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Get all masajids for logged-in user
 * Super admins see ALL masajids, regular users see only their masajids
 * @route GET /api/masajids
 */
exports.getAllMasajids = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    // Check if user is super admin
    const user = await User.findByPk(req.userId);
    const isSuperAdmin = user && user.is_super_admin;

    // Build where clause
    const whereClause = {
      is_active: true
    };

    // If NOT super admin, filter by user's masajids
    if (!isSuperAdmin) {
      const userMasajids = await UserMasjid.findAll({
        where: { user_id: req.userId },
        attributes: ['masjid_id']
      });

      const masjidIds = userMasajids.map(um => um.masjid_id);

      // If user has no masajids, return empty array
      if (masjidIds.length === 0) {
        return responseHelper.paginated(res, [], {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: 0
        }, 'No masajids found');
      }

      whereClause.id = { [Op.in]: masjidIds };
    }
    // Super admin sees ALL masajids (no id filter)

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { city: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: masajids } = await Masjid.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    logger.info(`Masajids retrieved for user ${req.userId} (Super Admin: ${isSuperAdmin}): ${count} total`);

    return responseHelper.paginated(res, masajids, {
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems: count
    }, 'Masajids retrieved successfully');
  } catch (error) {
    logger.error(`Get all masajids error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve masajids', 500);
  }
};

/**
 * Get single masjid details
 * @route GET /api/masajids/:id
 */
exports.getMasjidById = async (req, res) => {
  try {
    const { id } = req.params;

    const masjid = await Masjid.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    return responseHelper.success(res, masjid, 'Masjid retrieved successfully');
  } catch (error) {
    logger.error(`Get masjid by ID error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve masjid', 500);
  }
};

/**
 * Create new masjid
 * @route POST /api/masajids
 */
exports.createMasjid = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      name,
      location,
      address,
      city,
      state,
      country,
      postal_code,
      contact_email,
      contact_phone
    } = req.body;

    // Create masjid
    const masjid = await Masjid.create({
      name,
      location,
      address,
      city,
      state,
      country,
      postal_code,
      contact_email,
      contact_phone,
      created_by: req.userId
    }, { transaction });

    // Add creator as first admin with all permissions
    await UserMasjid.create({
      user_id: req.userId,
      masjid_id: masjid.id,
      role: 'admin',
      is_default: true,
      assigned_by: req.userId,
      can_view_complaints: true,
      can_answer_complaints: true,
      can_view_questions: true,
      can_answer_questions: true,
      can_change_prayer_times: true,
      can_create_events: true,
      can_create_notifications: true
    }, { transaction });

    await transaction.commit();

    logger.info(`Masjid created: ${masjid.name} by user: ${req.userId}`);

    return responseHelper.success(res, masjid, 'Masjid created successfully', 201);
  } catch (error) {
    await transaction.rollback();
    logger.error(`Create masjid error: ${error.message}`);
    return responseHelper.error(res, 'Failed to create masjid', 500);
  }
};

/**
 * Update masjid
 * @route PUT /api/masajids/:id
 */
exports.updateMasjid = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      location,
      address,
      city,
      state,
      country,
      postal_code,
      contact_email,
      contact_phone,
      is_active
    } = req.body;

    const masjid = await Masjid.findByPk(id);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    // Update fields
    if (name) masjid.name = name;
    if (location !== undefined) masjid.location = location;
    if (address !== undefined) masjid.address = address;
    if (city !== undefined) masjid.city = city;
    if (state !== undefined) masjid.state = state;
    if (country !== undefined) masjid.country = country;
    if (postal_code !== undefined) masjid.postal_code = postal_code;
    if (contact_email !== undefined) masjid.contact_email = contact_email;
    if (contact_phone !== undefined) masjid.contact_phone = contact_phone;
    if (is_active !== undefined) masjid.is_active = is_active;

    await masjid.save();

    logger.info(`Masjid updated: ${masjid.name} by user: ${req.userId}`);

    return responseHelper.success(res, masjid, 'Masjid updated successfully');
  } catch (error) {
    logger.error(`Update masjid error: ${error.message}`);
    return responseHelper.error(res, 'Failed to update masjid', 500);
  }
};

/**
 * Soft delete masjid
 * @route DELETE /api/masajids/:id
 */
exports.deleteMasjid = async (req, res) => {
  try {
    const { id } = req.params;

    const masjid = await Masjid.findByPk(id);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    // Soft delete
    masjid.is_active = false;
    await masjid.save();

    logger.info(`Masjid deleted: ${masjid.name} by user: ${req.userId}`);

    return responseHelper.success(res, null, 'Masjid deleted successfully');
  } catch (error) {
    logger.error(`Delete masjid error: ${error.message}`);
    return responseHelper.error(res, 'Failed to delete masjid', 500);
  }
};

/**
 * Set masjid as default for user
 * @route PUT /api/masajids/:id/set-default
 */
exports.setDefaultMasjid = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    // Check if user is member of masjid
    const userMasjid = await UserMasjid.findOne({
      where: {
        user_id: req.userId,
        masjid_id: id
      }
    });

    if (!userMasjid) {
      return responseHelper.forbidden(res, 'You are not a member of this masjid');
    }

    // Remove default from all other masajids for this user
    await UserMasjid.update(
      { is_default: false },
      {
        where: { user_id: req.userId },
        transaction
      }
    );

    // Set this masjid as default
    userMasjid.is_default = true;
    await userMasjid.save({ transaction });

    await transaction.commit();

    logger.info(`Default masjid set: ${id} for user: ${req.userId}`);

    return responseHelper.success(res, null, 'Default masjid set successfully');
  } catch (error) {
    await transaction.rollback();
    logger.error(`Set default masjid error: ${error.message}`);
    return responseHelper.error(res, 'Failed to set default masjid', 500);
  }
};

/**
 * Get masjid statistics
 * @route GET /api/masajids/:id/statistics
 */
exports.getMasjidStatistics = async (req, res) => {
  try {
    const { id } = req.params;

    const masjid = await Masjid.findByPk(id);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    // Get counts
    const [questionsCount, eventsCount, membersCount, newQuestionsCount] = await Promise.all([
      Question.count({ where: { masjid_id: id } }),
      Event.count({ where: { masjid_id: id } }),
      UserMasjid.count({ where: { masjid_id: id } }),
      Question.count({ where: { masjid_id: id, status: 'new' } })
    ]);

    const statistics = {
      totalQuestions: questionsCount,
      newQuestions: newQuestionsCount,
      totalEvents: eventsCount,
      totalMembers: membersCount
    };

    return responseHelper.success(res, statistics, 'Statistics retrieved successfully');
  } catch (error) {
    logger.error(`Get masjid statistics error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve statistics', 500);
  }
};

/**
 * Get all members of a masjid with their permissions
 * @route GET /api/masajids/:id/members
 */
exports.getMasjidMembers = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if masjid exists
    const masjid = await Masjid.findByPk(id);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    const members = await UserMasjid.findAll({
      where: { masjid_id: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'profile_picture', 'is_active']
        }
      ],
      order: [['assigned_at', 'DESC']]
    });

    // Format members with full details including permissions
    const formattedMembers = members.map(member => ({
      id: member.id,
      user_id: member.user.id,
      user_name: member.user.name,
      user_email: member.user.email,
      user_phone: member.user.phone,
      user_profile_picture: member.user.profile_picture,
      user_is_active: member.user.is_active,
      role: member.role,
      permissions: {
        can_view_complaints: member.can_view_complaints,
        can_answer_complaints: member.can_answer_complaints,
        can_view_questions: member.can_view_questions,
        can_answer_questions: member.can_answer_questions,
        can_change_prayer_times: member.can_change_prayer_times,
        can_create_events: member.can_create_events,
        can_create_notifications: member.can_create_notifications
      },
      assigned_at: member.assigned_at,
      is_default: member.is_default
    }));

    // Also provide grouped data
    const imams = formattedMembers.filter(m => m.role === 'imam');
    const admins = formattedMembers.filter(m => m.role === 'admin');

    logger.info(`Retrieved ${members.length} members for masjid ${id}`);

    return responseHelper.success(res, {
      members: formattedMembers,
      imams,
      admins,
      totalMembers: members.length
    }, 'Members retrieved successfully');
  } catch (error) {
    logger.error(`Get masjid members error: ${error.message}`, { masjidId: id, error: error.stack });
    return responseHelper.error(res, 'Failed to retrieve members', 500);
  }
};

