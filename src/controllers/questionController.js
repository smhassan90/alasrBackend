const { Question, Masjid, User, UserMasjid, MasjidSubscription, DeviceSettings, UserSettings } = require('../models');
const responseHelper = require('../utils/responseHelper');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');
const pushNotificationService = require('../utils/pushNotificationService');
const permissionChecker = require('../utils/permissionChecker');
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

    // Send push notifications to imams/admins for this masjid
    sendQuestionNotificationToImams(masjid, newQuestion).catch(err =>
      logger.error(`Failed to send question notification to imams: ${err.message}`)
    );

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

    const question = await Question.findByPk(id, {
      include: [
        {
          model: Masjid,
          as: 'masjid',
          attributes: ['id', 'name']
        }
      ]
    });
    if (!question) {
      return responseHelper.notFound(res, 'Question not found');
    }

    const hasPermission = await permissionChecker.canAnswerQuestions(req.userId, question.masjid_id);
    if (!hasPermission) {
      return responseHelper.forbidden(res, 'You do not have permission to answer questions for this masjid');
    }

    const replier = await User.findByPk(req.userId, {
      attributes: ['id', 'name', 'email']
    });
    if (!replier) {
      return responseHelper.forbidden(res, 'Replier not found');
    }

    question.reply = reply;
    question.status = 'replied';
    question.replied_by = req.userId;
    question.replied_at = new Date();
    await question.save();

    question.setDataValue('replier', replier);
    question.setDataValue('replied_by_name', replier.name);

    // Send email notification if user provided email
    if (question.user_email) {
      emailService.sendQuestionReplyEmail(question.user_email, question.title, reply).catch(err =>
        logger.error(`Failed to send reply email: ${err.message}`)
      );
    }

    // Send push notification to the user who asked the question
    sendQuestionReplyNotification(question.masjid, question, reply, replier.name).catch(err =>
      logger.error(`Failed to send question reply notification: ${err.message}`)
    );

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

/**
 * Send push notifications to imams/admins when a new question is submitted
 * @param {Object} masjid - Masjid object
 * @param {Object} question - Question object
 */
async function sendQuestionNotificationToImams(masjid, question) {
  try {
    // Find all imams and admins for this masjid
    const imamsAndAdmins = await UserMasjid.findAll({
      where: {
        masjid_id: masjid.id,
        role: { [Op.in]: ['imam', 'admin'] }
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (imamsAndAdmins.length === 0) {
      logger.info(`No imams or admins found for masjid ${masjid.id}`);
      return;
    }

    // Get user IDs of imams/admins
    const userIds = imamsAndAdmins.map(ua => ua.user_id);

    // Get FCM tokens for these users from MasjidSubscription
    const subscriptions = await MasjidSubscription.findAll({
      where: {
        masjid_id: masjid.id,
        user_id: { [Op.in]: userIds },
        is_active: true,
        fcm_token: { [Op.ne]: null }
      }
    });

    if (subscriptions.length === 0) {
      logger.info(`No active subscriptions with FCM tokens found for imams/admins of masjid ${masjid.id}`);
      return;
    }

    // Collect all FCM tokens
    const fcmTokens = subscriptions
      .map(sub => sub.fcm_token)
      .filter(token => token && token.trim() !== '');

    if (fcmTokens.length === 0) {
      logger.warn(`No valid FCM tokens found for imams/admins of masjid ${masjid.id}`);
      return;
    }

    // Prepare notification message
    const title = `New Question - ${masjid.name}`;
    const body = `${question.user_name} asked: ${question.title}`;

    // Prepare notification data
    const notificationData = {
      masjidId: masjid.id,
      masjidName: masjid.name,
      questionId: question.id,
      questionTitle: question.title,
      userName: question.user_name,
      category: 'General',
      type: 'new_question'
    };

    // Send push notifications in batch
    const result = await pushNotificationService.sendBatchPushNotifications(
      fcmTokens,
      title,
      body,
      notificationData
    );

    if (result.success) {
      logger.info(`Question notification sent to ${result.successful} imams/admins, ${result.failed} failed for masjid ${masjid.id}`);
      
      // Handle invalid tokens - deactivate subscriptions with invalid tokens
      if (result.results && result.results.length > 0) {
        const invalidTokens = result.results
          .filter(r => !r.success && (r.error?.code === 'messaging/invalid-registration-token' || r.error?.code === 'messaging/registration-token-not-registered'))
          .map(r => r.token);

        if (invalidTokens.length > 0) {
          await MasjidSubscription.update(
            { is_active: false },
            {
              where: {
                masjid_id: masjid.id,
                fcm_token: { [Op.in]: invalidTokens }
              }
            }
          );
          logger.info(`Deactivated ${invalidTokens.length} subscriptions with invalid FCM tokens`);
        }
      }
    } else {
      logger.error(`Failed to send question notifications to imams/admins: ${result.error}`);
    }
  } catch (error) {
    logger.error(`Error sending question notifications to imams/admins: ${error.message}`);
    // Don't throw - we don't want to fail question creation if notification sending fails
  }
}

/**
 * Send push notification to user when their question is replied to
 * @param {Object} masjid - Masjid object
 * @param {Object} question - Question object
 * @param {string} reply - Reply text
 */
async function sendQuestionReplyNotification(masjid, question, reply, replierName) {
  try {
    // Get ALL active subscriptions for this masjid (similar to send-push endpoint)
    const allSubscriptions = await MasjidSubscription.findAll({
      where: {
        masjid_id: masjid.id,
        is_active: true,
        fcm_token: { [Op.ne]: null }
      },
      include: [
        {
          model: User,
          as: 'user',
          required: false,
          include: [
            {
              model: UserSettings,
              as: 'settings',
              required: false
            }
          ]
        }
      ]
    });

    if (allSubscriptions.length === 0) {
      logger.info(`No active subscriptions with FCM tokens found for masjid ${masjid.id}`);
      return;
    }

    // Get device settings for all anonymous subscriptions
    const anonymousDeviceIds = allSubscriptions
      .filter(sub => !sub.user_id && sub.device_id)
      .map(sub => sub.device_id);
    
    const deviceSettingsMap = {};
    if (anonymousDeviceIds.length > 0) {
      const deviceSettings = await DeviceSettings.findAll({
        where: { device_id: { [Op.in]: anonymousDeviceIds } }
      });
      deviceSettings.forEach(ds => {
        deviceSettingsMap[ds.device_id] = ds;
      });
    }

    // Filter subscriptions to find the one that matches the question's user
    // If question has user_id, match by user_id
    // If question has device_id, try to match by device_id, but also include all if no match
    let targetSubscriptions = [];

    if (question.user_id) {
      // Match by user_id
      targetSubscriptions = allSubscriptions.filter(sub => sub.user_id === question.user_id);
    } else if (question.device_id) {
      // Try to match by device_id first
      targetSubscriptions = allSubscriptions.filter(sub => 
        !sub.user_id && sub.device_id && sub.device_id === question.device_id
      );
      
      // If no exact match, use all anonymous subscriptions (device_id might be stored differently)
      // This ensures the user gets notified even if device_id format differs
      if (targetSubscriptions.length === 0) {
        logger.info(`No exact device_id match for question ${question.id}, using all anonymous subscriptions for masjid ${masjid.id}`);
        targetSubscriptions = allSubscriptions.filter(sub => !sub.user_id && sub.device_id);
      }
    } else {
      // No user_id or device_id - cannot send notification
      logger.info(`Question ${question.id} has no user_id or device_id, cannot send notification`);
      return;
    }

    if (targetSubscriptions.length === 0) {
      logger.info(`No matching subscriptions found for question ${question.id}`);
      return;
    }

    // Filter by user preferences for question notifications
    const validSubscriptions = targetSubscriptions.filter(sub => {
      if (sub.user_id) {
        // Authenticated user - check user settings
        const settings = sub.user?.settings;
        // Default to true if no settings (as per UserSettings model default)
        return !settings || settings.questions_notifications !== false;
      } else if (sub.device_id) {
        // Anonymous user - check device settings
        const deviceSettings = deviceSettingsMap[sub.device_id];
        // Default to true if no settings (as per DeviceSettings model default)
        return !deviceSettings || deviceSettings.questions_notifications !== false;
      }
      return false;
    });

    if (validSubscriptions.length === 0) {
      logger.info(`All subscriptions for question ${question.id} have questions notifications disabled`);
      return;
    }

    logger.info(`Found ${validSubscriptions.length} valid subscriptions for question ${question.id} (user_id: ${question.user_id || 'N/A'}, device_id: ${question.device_id || 'N/A'})`);

    // Collect FCM tokens, ensure uniqueness
    const fcmTokens = [...new Set(validSubscriptions
      .map(sub => sub.fcm_token)
      .filter(token => token && token.trim() !== ''))];

    if (fcmTokens.length === 0) {
      logger.warn(`No valid FCM tokens found for question ${question.id} after filtering`);
      return;
    }

    logger.info(`Sending question reply notification to ${fcmTokens.length} FCM tokens for question ${question.id}`);

    // Prepare notification message
    const title = `Reply to Your Question - ${masjid.name}`;
    // Truncate reply if too long for notification body
    const replyPreview = reply.length > 100 ? reply.substring(0, 100) + '...' : reply;
    const body = `Your question "${question.title}" has been answered by ${replierName || 'the imam'}: ${replyPreview}`;

    // Prepare notification data
    const notificationData = {
      masjidId: masjid.id,
      masjidName: masjid.name,
      questionId: question.id,
      questionTitle: question.title,
      category: 'General',
      type: 'question_reply',
      repliedByName: replierName || ''
    };

    // Send push notification
    const result = await pushNotificationService.sendBatchPushNotifications(
      fcmTokens,
      title,
      body,
      notificationData
    );

    if (result.success) {
      logger.info(`Question reply notifications sent: ${result.successful} successful, ${result.failed} failed for question ${question.id}`);

      if (result.results && result.results.length > 0) {
        const invalidTokens = result.results
          .filter(r => !r.success && (r.error?.code === 'messaging/invalid-registration-token' || r.error?.code === 'messaging/registration-token-not-registered'))
          .map(r => r.token);

        if (invalidTokens.length > 0) {
          await MasjidSubscription.update(
            { is_active: false },
            {
              where: {
                fcm_token: { [Op.in]: invalidTokens }
              }
            }
          );
          logger.info(`Deactivated ${invalidTokens.length} subscriptions with invalid FCM tokens for question ${question.id}`);
        }
      }
    } else {
      logger.error(`Failed to send question reply notification: ${result.error}`);
    }
  } catch (error) {
    logger.error(`Error sending question reply notification: ${error.message}`);
    // Don't throw - we don't want to fail reply if notification sending fails
  }
}

