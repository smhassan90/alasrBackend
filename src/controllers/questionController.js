const { Question, Masjid, User, UserMasjid, MasjidSubscription, DeviceSettings, UserSettings } = require('../models');
const responseHelper = require('../utils/responseHelper');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');
const pushNotificationService = require('../utils/pushNotificationService');
const { Op } = require('sequelize');
const { generateDeviceId, isValidDeviceId } = require('../utils/deviceId');
const activityLogService = require('../services/activityLogService');

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

    if (masjid.ask_imam_enabled === false || masjid.ask_imam_enabled === 0) {
      return responseHelper.error(res, 'Ask Imam is not available for this masjid', 403);
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
  const startedAt = Date.now();
  try {
    const { id } = req.params;
    const { reply } = req.body;

    // Prefer question already loaded by canAnswerQuestions middleware
    let question = req.question;
    if (!question || question.id !== id) {
      question = await Question.findByPk(id, {
        include: [
          {
            model: Masjid,
            as: 'masjid',
            attributes: ['id', 'name']
          }
        ]
      });
    }
    if (!question) {
      return responseHelper.notFound(res, 'Question not found');
    }

    // Permission already verified by canAnswerQuestions middleware.
    // authenticate() already loaded the user, so avoid re-querying it.
    let replier = req.user && req.user.id === req.userId
      ? { id: req.user.id, name: req.user.name, email: req.user.email }
      : await User.findByPk(req.userId, { attributes: ['id', 'name', 'email'] });

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

    logger.info(`Question ${id} replied by ${req.userId} in ${Date.now() - startedAt}ms`);

    activityLogService.logQuestionAnswered({
      masjidId: question.masjid_id,
      userId: req.userId,
      actorName: replier.name,
      questionTitle: question.title
    }).catch(() => {});

    // Notify after responding so email/FCM never block the API response
    const masjid = question.masjid || { id: question.masjid_id, name: 'Masjid' };
    setImmediate(() => {
      if (question.user_email) {
        emailService.sendQuestionReplyEmail(question.user_email, question.title, reply).catch(err =>
          logger.error(`Failed to send reply email: ${err.message}`)
        );
      }

      sendQuestionReplyNotification(masjid, question, reply, replier.name).catch(err =>
        logger.error(`Failed to send question reply notification: ${err.message}`)
      );
    });

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
 * Find anonymous subscriptions whose raw device_id hashes to the question's hashed device_id.
 * Questions store hashed device IDs; subscriptions often store the raw client device ID.
 */
function matchHashedDeviceSubscriptions(questionDeviceId, anonymousSubs) {
  const commonPlatforms = ['android', 'ios', 'web'];
  const commonAppVersions = ['', '1.0.0', '1.0'];
  const matches = [];

  for (const sub of anonymousSubs) {
    if (!sub.device_id) continue;
    // Already hashed — exact DB match would have caught it
    if (sub.device_id.length === 32 && /^[a-f0-9]{32}$/i.test(sub.device_id)) {
      continue;
    }

    let matched = false;
    for (const platform of commonPlatforms) {
      for (const appVersion of commonAppVersions) {
        try {
          if (generateDeviceId(sub.device_id, platform, appVersion) === questionDeviceId) {
            matches.push(sub);
            matched = true;
            break;
          }
        } catch (err) {
          // Skip invalid device_id
        }
      }
      if (matched) break;
    }
  }

  return matches;
}

/**
 * Send push notification to user when their question is replied to.
 * Queries only the asker's subscription(s) — not every subscriber on the masjid.
 */
async function sendQuestionReplyNotification(masjid, question, reply, replierName) {
  try {
    logger.info(`Starting reply notification for question ${question.id}, masjid ${masjid.id}, user_id: ${question.user_id || 'N/A'}, device_id: ${question.device_id || 'N/A'}`);

    let targetSubscriptions = [];

    if (question.user_id) {
      targetSubscriptions = await MasjidSubscription.findAll({
        where: {
          masjid_id: masjid.id,
          user_id: question.user_id,
          is_active: true,
          fcm_token: { [Op.ne]: null }
        },
        include: [
          {
            model: User,
            as: 'user',
            required: false,
            attributes: ['id'],
            include: [
              {
                model: UserSettings,
                as: 'settings',
                required: false,
                attributes: ['questions_notifications']
              }
            ]
          }
        ]
      });
      logger.info(`Matching by user_id for question ${question.id}: found ${targetSubscriptions.length} subscriptions`);
    } else if (question.device_id) {
      // Exact match first (indexed lookup)
      targetSubscriptions = await MasjidSubscription.findAll({
        where: {
          masjid_id: masjid.id,
          device_id: question.device_id,
          user_id: { [Op.is]: null },
          is_active: true,
          fcm_token: { [Op.ne]: null }
        },
        attributes: ['id', 'device_id', 'fcm_token', 'user_id']
      });

      // Fallback: question device_id is hashed, subscription may store raw device_id
      if (
        targetSubscriptions.length === 0 &&
        question.device_id.length === 32 &&
        /^[a-f0-9]{32}$/i.test(question.device_id)
      ) {
        const anonymousSubs = await MasjidSubscription.findAll({
          where: {
            masjid_id: masjid.id,
            user_id: { [Op.is]: null },
            device_id: { [Op.ne]: null },
            is_active: true,
            fcm_token: { [Op.ne]: null }
          },
          attributes: ['id', 'device_id', 'fcm_token', 'user_id']
        });

        targetSubscriptions = matchHashedDeviceSubscriptions(question.device_id, anonymousSubs);

        if (targetSubscriptions.length === 0) {
          logger.warn(`No device_id match found for question ${question.id} (hash: ${question.device_id}) among ${anonymousSubs.length} anonymous subscriptions`);
        } else {
          logger.info(`Matched question ${question.id} device_id by hashing: found ${targetSubscriptions.length} subscriptions`);
        }
      } else if (targetSubscriptions.length > 0) {
        logger.info(`Exact device_id match found for question ${question.id}: ${targetSubscriptions.length} subscriptions`);
      }
    } else {
      logger.warn(`Question ${question.id} has no user_id or device_id, cannot send notification`);
      return;
    }

    if (targetSubscriptions.length === 0) {
      logger.warn(`No matching subscriptions found for question ${question.id} (user_id: ${question.user_id || 'N/A'}, device_id: ${question.device_id || 'N/A'})`);
      return;
    }

    // Load notification prefs only for matched anonymous devices
    const anonymousDeviceIds = targetSubscriptions
      .filter(sub => !sub.user_id && sub.device_id)
      .map(sub => sub.device_id);

    const deviceSettingsMap = {};
    if (anonymousDeviceIds.length > 0) {
      const deviceSettings = await DeviceSettings.findAll({
        where: { device_id: { [Op.in]: anonymousDeviceIds } },
        attributes: ['device_id', 'questions_notifications']
      });
      deviceSettings.forEach(ds => {
        deviceSettingsMap[ds.device_id] = ds;
      });
    }

    const validSubscriptions = targetSubscriptions.filter(sub => {
      if (sub.user_id) {
        const settings = sub.user?.settings;
        return !settings || settings.questions_notifications !== false;
      }
      if (sub.device_id) {
        const deviceSettings = deviceSettingsMap[sub.device_id];
        return !deviceSettings || deviceSettings.questions_notifications !== false;
      }
      return false;
    });

    if (validSubscriptions.length === 0) {
      logger.warn(`All ${targetSubscriptions.length} subscriptions for question ${question.id} have questions notifications disabled`);
      return;
    }

    const fcmTokens = [...new Set(validSubscriptions
      .map(sub => sub.fcm_token)
      .filter(token => token && token.trim() !== ''))];

    if (fcmTokens.length === 0) {
      logger.warn(`No valid FCM tokens found for question ${question.id} after filtering`);
      return;
    }

    logger.info(`Sending question reply notification to ${fcmTokens.length} FCM tokens for question ${question.id}`);

    const title = `Reply to Your Question - ${masjid.name}`;
    const replyPreview = reply.length > 100 ? reply.substring(0, 100) + '...' : reply;
    const body = `Your question "${question.title}" has been answered by ${replierName || 'the imam'}: ${replyPreview}`;

    const notificationData = {
      masjidId: masjid.id,
      masjidName: masjid.name,
      questionId: question.id,
      questionTitle: question.title,
      category: 'General',
      type: 'question_reply',
      repliedByName: replierName || ''
    };

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
      logger.error(`Failed to send question reply notification for question ${question.id}: ${result.error}`, {
        questionId: question.id,
        masjidId: masjid.id,
        fcmTokensCount: fcmTokens.length,
        error: result.error,
        code: result.code
      });
    }
  } catch (error) {
    logger.error(`Error sending question reply notification for question ${question.id}: ${error.message}`, {
      questionId: question.id,
      masjidId: masjid?.id,
      error: error.message,
      stack: error.stack
    });
    // Don't throw - we don't want to fail reply if notification sending fails
  }
}

