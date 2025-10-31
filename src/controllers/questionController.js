const { Question, Masjid, User } = require('../models');
const responseHelper = require('../utils/responseHelper');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

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
 * Submit new question (public endpoint)
 * @route POST /api/questions
 */
exports.createQuestion = async (req, res) => {
  try {
    const { masjidId, userName, userEmail, title, question } = req.body;

    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    const newQuestion = await Question.create({
      masjid_id: masjidId,
      user_name: userName,
      user_email: userEmail,
      title,
      question,
      status: 'new'
    });

    logger.info(`New question submitted for masjid ${masjidId}`);

    return responseHelper.success(res, newQuestion, 'Question submitted successfully', 201);
  } catch (error) {
    logger.error(`Create question error: ${error.message}`);
    return responseHelper.error(res, 'Failed to submit question', 500);
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

