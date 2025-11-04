const { Question, Masjid, User } = require('../models');
const responseHelper = require('../utils/responseHelper');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const { generateDeviceId, isValidDeviceId } = require('../utils/deviceId');

/**
 * Get ALL questions across all masajids (Super Admin only)
 * @route GET /api/questions
 */
exports.getAllQuestions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search, masjidId } = req.query;
    const offset = (page - 1) * limit;

    // Check if user is super admin
    const user = await User.findByPk(req.userId);
    if (!user || !user.is_super_admin) {
      return responseHelper.forbidden(res, 'Only super admins can access all questions');
    }

    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (masjidId) {
      whereClause.masjid_id = masjidId;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { question: { [Op.like]: `%${search}%` } },
        { user_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: questions } = await Question.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Masjid,
          as: 'masjid',
          attributes: ['id', 'name', 'city', 'state']
        },
        {
          model: User,
          as: 'replier',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    logger.info(`Super admin ${req.userId} retrieved ${count} questions`);

    return responseHelper.paginated(res, questions, {
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems: count
    }, 'All questions retrieved successfully');
  } catch (error) {
    logger.error(`Get all questions error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve questions', 500);
  }
};

/**
 * Get all questions for a masjid
 * @route GET /api/questions/masjid/:masjidId
 */
exports.getQuestionsByMasjid = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const { page = 1, limit = 10, status, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { masjid_id: masjidId };

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { question: { [Op.like]: `%${search}%` } },
        { user_name: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: questions } = await Question.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'replier',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return responseHelper.paginated(res, questions, {
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems: count
    }, 'Questions retrieved successfully');
  } catch (error) {
    logger.error(`Get questions error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve questions', 500);
  }
};

/**
 * Get single question
 * @route GET /api/questions/:id
 */
exports.getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findByPk(id, {
      include: [
        {
          model: Masjid,
          as: 'masjid',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'replier',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!question) {
      return responseHelper.notFound(res, 'Question not found');
    }

    return responseHelper.success(res, question, 'Question retrieved successfully');
  } catch (error) {
    logger.error(`Get question by ID error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve question', 500);
  }
};

/**
 * Get questions by authenticated user (protected endpoint)
 * @route GET /api/questions/my-questions
 */
exports.getMyQuestions = async (req, res) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows: questions } = await Question.findAndCountAll({
      where: { user_id: userId },
      include: [
        {
          model: Masjid,
          as: 'masjid',
          attributes: ['id', 'name', 'city', 'state']
        },
        {
          model: User,
          as: 'replier',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    logger.info(`Retrieved ${count} questions for user ${userId}`);

    return responseHelper.paginated(res, questions, {
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems: count
    }, 'Questions retrieved successfully');
  } catch (error) {
    logger.error(`Get my questions error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve questions', 500);
  }
};

/**
 * Get questions by device ID (public endpoint - for anonymous users to retrieve their questions)
 * @route GET /api/questions/by-device
 */
exports.getQuestions = async (req, res) => {
  try {
    const { deviceId, platform, appVersion } = req.query;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Validate device ID and platform
    if (!deviceId || !platform) {
      return responseHelper.error(res, 'Device ID and platform are required as query parameters', 400);
    }

    // Generate unique device identifier (same as when creating)
    const uniqueDeviceId = generateDeviceId(deviceId, platform, appVersion || '');

    const { count, rows: questions } = await Question.findAndCountAll({
      where: { device_id: uniqueDeviceId },
      include: [
        {
          model: Masjid,
          as: 'masjid',
          attributes: ['id', 'name', 'city', 'state']
        },
        {
          model: User,
          as: 'replier',
          attributes: ['id', 'name', 'email']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    logger.info(`Retrieved ${count} questions for device ${uniqueDeviceId}`);

    return responseHelper.paginated(res, questions, {
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems: count
    }, 'Questions retrieved successfully');
  } catch (error) {
    logger.error(`Get questions by device error: ${error.message}`);
    if (error.message.includes('required')) {
      return responseHelper.error(res, error.message, 400);
    }
    return responseHelper.error(res, 'Failed to retrieve questions', 500);
  }
};

/**
 * Submit new question (public endpoint, supports anonymous users via device_id)
 * @route POST /api/questions
 */
exports.setQuestions = async (req, res) => {
  try {
    const { masjidId, deviceId, platform, appVersion, userName, userEmail, title, question } = req.body;

    // Validate masjid exists
    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    // Validate device ID is provided
    if (!deviceId || !platform) {
      return responseHelper.error(res, 'Device ID and platform are required', 400);
    }

    // Generate unique device identifier
    const uniqueDeviceId = generateDeviceId(deviceId, platform, appVersion || '');

    // Validate user name
    if (!userName || userName.trim().length < 2) {
      return responseHelper.error(res, 'User name is required and must be at least 2 characters', 400);
    }

    const newQuestion = await Question.create({
      masjid_id: masjidId,
      user_id: null, // Anonymous users don't have user_id
      device_id: uniqueDeviceId,
      user_name: userName.trim(),
      user_email: userEmail ? userEmail.trim() : null,
      title: title.trim(),
      question: question.trim(),
      status: 'new'
    });

    logger.info(`New question submitted for masjid ${masjidId} by anonymous device ${uniqueDeviceId}`);

    return responseHelper.success(res, newQuestion, 'Question submitted successfully', 201);
  } catch (error) {
    logger.error(`Set question error: ${error.message}`);
    logger.error(`Set question error stack: ${error.stack}`);
    if (error.message.includes('required')) {
      return responseHelper.error(res, error.message, 400);
    }
    // Include error details in response for debugging
    return responseHelper.error(res, 'Failed to submit question', 500, {
      message: error.message,
      name: error.name,
      // Only include stack in development
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
  }
};

/**
 * Reply to question
 * @route PUT /api/questions/:id/reply
 */
exports.replyToQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    const question = await Question.findByPk(id);
    if (!question) {
      return responseHelper.notFound(res, 'Question not found');
    }

    question.reply = reply;
    question.status = 'replied';
    question.replied_by = req.userId;
    question.replied_at = new Date();
    await question.save();

    // Send email notification if user provided email
    if (question.user_email) {
      emailService.sendQuestionReplyEmail(question.user_email, question.title, reply).catch(err =>
        logger.error(`Failed to send reply email: ${err.message}`)
      );
    }

    logger.info(`Question ${id} replied by ${req.userId}`);

    return responseHelper.success(res, question, 'Reply sent successfully');
  } catch (error) {
    logger.error(`Reply to question error: ${error.message}`);
    return responseHelper.error(res, 'Failed to send reply', 500);
  }
};

/**
 * Update question status
 * @route PUT /api/questions/:id/status
 */
exports.updateQuestionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const question = await Question.findByPk(id);
    if (!question) {
      return responseHelper.notFound(res, 'Question not found');
    }

    question.status = status;
    await question.save();

    logger.info(`Question ${id} status updated to ${status} by ${req.userId}`);

    return responseHelper.success(res, question, 'Question status updated successfully');
  } catch (error) {
    logger.error(`Update question status error: ${error.message}`);
    return responseHelper.error(res, 'Failed to update question status', 500);
  }
};

/**
 * Delete question
 * @route DELETE /api/questions/:id
 */
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findByPk(id);
    if (!question) {
      return responseHelper.notFound(res, 'Question not found');
    }

    await question.destroy();

    logger.info(`Question ${id} deleted by ${req.userId}`);

    return responseHelper.success(res, null, 'Question deleted successfully');
  } catch (error) {
    logger.error(`Delete question error: ${error.message}`);
    return responseHelper.error(res, 'Failed to delete question', 500);
  }
};

/**
 * Get questions statistics for a masjid
 * @route GET /api/questions/masjid/:masjidId/statistics
 */
exports.getQuestionStatistics = async (req, res) => {
  try {
    const { masjidId } = req.params;

    const [totalQuestions, newQuestions, repliedQuestions] = await Promise.all([
      Question.count({ where: { masjid_id: masjidId } }),
      Question.count({ where: { masjid_id: masjidId, status: 'new' } }),
      Question.count({ where: { masjid_id: masjidId, status: 'replied' } })
    ]);

    const statistics = {
      totalQuestions,
      newQuestions,
      repliedQuestions
    };

    return responseHelper.success(res, statistics, 'Statistics retrieved successfully');
  } catch (error) {
    logger.error(`Get question statistics error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve statistics', 500);
  }
};

