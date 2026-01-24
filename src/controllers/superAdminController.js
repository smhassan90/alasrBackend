const { User, Masjid, UserMasjid, MasjidSubscription, sequelize, AppConfig } = require('../models');

/**
 * Get all users (Super Admin only)
 * @route GET /api/super-admin/users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires', 'email_verification_token'] },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return responseHelper.paginated(res, users, {
      page: parseInt(page),
      limit: parseInt(limit),
      totalItems: count
    }, 'Users retrieved successfully');
  } catch (error) {
    logger.error(`Get all users error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve users', 500);
  }
};

/**
 * Get single user details (Super Admin only)
 * @route GET /api/super-admin/users/:id
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return responseHelper.error(res, 'Invalid user ID format', 400);
    }

    // Try to get user with masjid assignments
    let user;
    try {
      user = await User.findByPk(id, {
        attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires', 'email_verification_token'] },
        include: [
          {
            model: UserMasjid,
            as: 'userMasajids',
            required: false, // Left join - include even if no masjid assignments
            include: [
              {
                model: Masjid,
                as: 'masjid',
                required: false, // Left join - include even if masjid doesn't exist
                attributes: ['id', 'name', 'city']
              }
            ]
          }
        ]
      });
    } catch (includeError) {
      // If include fails, try without includes
      logger.warn(`Include query failed, trying without includes: ${includeError.message}`);
      user = await User.findByPk(id, {
        attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires', 'email_verification_token'] }
      });
    }

    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    return responseHelper.success(res, user, 'User retrieved successfully');
  } catch (error) {
    logger.error(`Get user by ID error: ${error.message}`);
    logger.error(`Get user by ID error stack: ${error.stack}`);
    return responseHelper.error(res, 'Failed to retrieve user', 500, {
      message: error.message,
      name: error.name,
      ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
  }
};

/**
 * Promote user to super admin (Super Admin only)
 * @route PUT /api/super-admin/users/:id/promote
 */
exports.promoteToSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.userId) {
      return responseHelper.error(res, 'You cannot modify your own super admin status', 400);
    }

    const user = await User.findByPk(id);
    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    if (user.is_super_admin) {
      return responseHelper.error(res, 'User is already a super admin', 400);
    }

    user.is_super_admin = true;
    await user.save();

    logger.info(`User ${id} promoted to super admin by ${req.userId}`);

    return responseHelper.success(res, user.toSafeObject(), 'User promoted to super admin successfully');
  } catch (error) {
    logger.error(`Promote to super admin error: ${error.message}`);
    return responseHelper.error(res, 'Failed to promote user', 500);
  }
};

/**
 * Demote user from super admin (Super Admin only)
 * @route PUT /api/super-admin/users/:id/demote
 */
exports.demoteFromSuperAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.userId) {
      return responseHelper.error(res, 'You cannot modify your own super admin status', 400);
    }

    const user = await User.findByPk(id);
    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    if (!user.is_super_admin) {
      return responseHelper.error(res, 'User is not a super admin', 400);
    }

    // Check if this is the last super admin
    const superAdminCount = await User.count({ where: { is_super_admin: true } });
    if (superAdminCount === 1) {
      return responseHelper.error(res, 'Cannot demote the last super admin', 400);
    }

    user.is_super_admin = false;
    await user.save();

    logger.info(`User ${id} demoted from super admin by ${req.userId}`);

    return responseHelper.success(res, user.toSafeObject(), 'User demoted from super admin successfully');
  } catch (error) {
    logger.error(`Demote from super admin error: ${error.message}`);
    return responseHelper.error(res, 'Failed to demote user', 500);
  }
};

/**
 * Get all super admins (Super Admin only)
 * @route GET /api/super-admin/list
 */
exports.getAllSuperAdmins = async (req, res) => {
  try {
    const superAdmins = await User.findAll({
      where: { is_super_admin: true },
      attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires', 'email_verification_token'] },
      order: [['created_at', 'ASC']]
    });

    return responseHelper.success(res, superAdmins, 'Super admins retrieved successfully');
  } catch (error) {
    logger.error(`Get super admins error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve super admins', 500);
  }
};

/**
 * Deactivate user account (Super Admin only)
 * @route PUT /api/super-admin/users/:id/deactivate
 */
exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.userId) {
      return responseHelper.error(res, 'You cannot deactivate your own account', 400);
    }

    const user = await User.findByPk(id);
    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    user.is_active = false;
    await user.save();

    logger.info(`User ${id} deactivated by ${req.userId}`);

    return responseHelper.success(res, user.toSafeObject(), 'User deactivated successfully');
  } catch (error) {
    logger.error(`Deactivate user error: ${error.message}`);
    return responseHelper.error(res, 'Failed to deactivate user', 500);
  }
};

/**
 * Activate user account (Super Admin only)
 * @route PUT /api/super-admin/users/:id/activate
 */
exports.activateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    user.is_active = true;
    await user.save();

    logger.info(`User ${id} activated by ${req.userId}`);

    return responseHelper.success(res, user.toSafeObject(), 'User activated successfully');
  } catch (error) {
    logger.error(`Activate user error: ${error.message}`);
    return responseHelper.error(res, 'Failed to activate user', 500);
  }
};

/**
 * Create new user and optionally assign to masjid (Super Admin only)
 * @route POST /api/super-admin/users
 */
exports.createUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      name,
      email,
      password,
      phone,
      is_super_admin = false,
      masjid_assignment
    } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return responseHelper.error(res, 'Email already registered', 400);
    }

    // Create user - password will be hashed by the User model's beforeCreate hook
    const user = await User.create({
      name,
      email,
      password: password, // Pass raw password - model hook will hash it
      phone: phone || null,
      is_super_admin,
      is_active: true,
      email_verified: true, // Auto-verify for super admin created users
      auth_provider: 'local' // Ensure auth_provider is set so hook processes password
    }, { transaction });

    // If masjid assignment is provided, assign user to masjid
    let userMasjid = null;
    if (masjid_assignment && masjid_assignment.masjid_id) {
      const { masjid_id, role, permissions } = masjid_assignment;

      // Verify masjid exists
      const masjid = await Masjid.findByPk(masjid_id);
      if (!masjid) {
        await transaction.rollback();
        return responseHelper.error(res, 'Masjid not found', 404);
      }

      // Set default permissions based on role if not provided
      const defaultPermissions = {
        can_view_complaints: permissions?.can_view_complaints ?? (role === 'admin'),
        can_answer_complaints: permissions?.can_answer_complaints ?? (role === 'admin'),
        can_view_questions: permissions?.can_view_questions ?? true,
        can_answer_questions: permissions?.can_answer_questions ?? true,
        can_change_prayer_times: permissions?.can_change_prayer_times ?? true,
        can_create_events: permissions?.can_create_events ?? true,
        can_create_notifications: permissions?.can_create_notifications ?? true
      };

      userMasjid = await UserMasjid.create({
        user_id: user.id,
        masjid_id,
        role,
        assigned_by: req.userId,
        ...defaultPermissions
      }, { transaction });
    }

    await transaction.commit();

    logger.info(`User ${user.email} created by super admin ${req.userId}`);

    const response = {
      user: user.toSafeObject(),
      masjid_assignment: userMasjid ? {
        masjid_id: userMasjid.masjid_id,
        role: userMasjid.role,
        permissions: {
          can_view_complaints: userMasjid.can_view_complaints,
          can_answer_complaints: userMasjid.can_answer_complaints,
          can_view_questions: userMasjid.can_view_questions,
          can_answer_questions: userMasjid.can_answer_questions,
          can_change_prayer_times: userMasjid.can_change_prayer_times,
          can_create_events: userMasjid.can_create_events,
          can_create_notifications: userMasjid.can_create_notifications
        }
      } : null
    };

    return responseHelper.success(res, response, 'User created successfully', 201);
  } catch (error) {
    await transaction.rollback();
    logger.error(`Create user error: ${error.message}`);
    return responseHelper.error(res, 'Failed to create user', 500);
  }
};

/**
 * Update user (Super Admin only)
 * @route PUT /api/super-admin/users/:id
 */
exports.updateUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { name, email, password, phone, is_active, masjid_assignment } = req.body;

    const user = await User.findByPk(id, { transaction });
    if (!user) {
      await transaction.rollback();
      return responseHelper.notFound(res, 'User not found');
    }

    // Update fields if provided
    if (name !== undefined) {
      user.name = name.trim();
    }

    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        where: { 
          email: email.trim(),
          id: { [Op.ne]: id }
        },
        transaction
      });
      
      if (existingUser) {
        await transaction.rollback();
        return responseHelper.error(res, 'Email already registered', 400);
      }
      
      user.email = email.trim();
    }

    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    if (phone !== undefined) {
      user.phone = phone ? phone.trim() : null;
    }

    if (is_active !== undefined) {
      // Cannot deactivate yourself
      if (!is_active && id === req.userId) {
        await transaction.rollback();
        return responseHelper.error(res, 'You cannot deactivate your own account', 400);
      }
      user.is_active = is_active;
    }

    await user.save({ transaction });

    // Handle masjid_assignment
    let userMasjid = null;
    
    if (masjid_assignment !== undefined) {
      if (masjid_assignment === null) {
        // Remove masjid assignment if null is provided
        await UserMasjid.destroy({
          where: { user_id: id },
          transaction
        });
        logger.info(`Masjid assignment removed for user ${id}`);
      } else if (masjid_assignment.masjid_id) {
        // Verify masjid exists
        const masjid = await Masjid.findByPk(masjid_assignment.masjid_id, { transaction });
        if (!masjid) {
          await transaction.rollback();
          return responseHelper.error(res, 'Masjid not found', 404);
        }

        // Check if user already has a masjid assignment
        const existingAssignment = await UserMasjid.findOne({
          where: { user_id: id },
          transaction
        });

        // Set default permissions based on role if not provided
        const defaultPermissions = {
          can_view_complaints: masjid_assignment.permissions?.can_view_complaints ?? (masjid_assignment.role === 'admin'),
          can_answer_complaints: masjid_assignment.permissions?.can_answer_complaints ?? (masjid_assignment.role === 'admin'),
          can_view_questions: masjid_assignment.permissions?.can_view_questions ?? true,
          can_answer_questions: masjid_assignment.permissions?.can_answer_questions ?? true,
          can_change_prayer_times: masjid_assignment.permissions?.can_change_prayer_times ?? true,
          can_create_events: masjid_assignment.permissions?.can_create_events ?? true,
          can_create_notifications: masjid_assignment.permissions?.can_create_notifications ?? true
        };

        if (existingAssignment) {
          // Update existing assignment
          existingAssignment.masjid_id = masjid_assignment.masjid_id;
          existingAssignment.role = masjid_assignment.role;
          existingAssignment.assigned_by = req.userId;
          Object.assign(existingAssignment, defaultPermissions);
          await existingAssignment.save({ transaction });
          userMasjid = existingAssignment;
          logger.info(`Masjid assignment updated for user ${id}`);
        } else {
          // Create new assignment
          userMasjid = await UserMasjid.create({
            user_id: id,
            masjid_id: masjid_assignment.masjid_id,
            role: masjid_assignment.role,
            assigned_by: req.userId,
            ...defaultPermissions
          }, { transaction });
          logger.info(`Masjid assignment created for user ${id}`);
        }
      }
    } else {
      // masjid_assignment not provided - fetch existing assignment for response
      userMasjid = await UserMasjid.findOne({
        where: { user_id: id },
        transaction
      });
    }

    await transaction.commit();

    logger.info(`User ${id} updated by super admin ${req.userId}`);

    // Return response matching create user format
    const response = {
      user: user.toSafeObject(),
      masjid_assignment: userMasjid ? {
        masjid_id: userMasjid.masjid_id,
        role: userMasjid.role,
        permissions: {
          can_view_complaints: userMasjid.can_view_complaints,
          can_answer_complaints: userMasjid.can_answer_complaints,
          can_view_questions: userMasjid.can_view_questions,
          can_answer_questions: userMasjid.can_answer_questions,
          can_change_prayer_times: userMasjid.can_change_prayer_times,
          can_create_events: userMasjid.can_create_events,
          can_create_notifications: userMasjid.can_create_notifications
        }
      } : null
    };

    return responseHelper.success(res, response, 'User updated successfully');
  } catch (error) {
    await transaction.rollback();
    logger.error(`Update user error: ${error.message}`);
    logger.error(`Update user error stack: ${error.stack}`);
    return responseHelper.error(res, 'Failed to update user', 500);
  }
};

/**
 * Delete user permanently (Super Admin only)
 * @route DELETE /api/super-admin/users/:id
 */
exports.deleteUser = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    // Cannot delete yourself
    if (id === req.userId) {
      return responseHelper.error(res, 'You cannot delete your own account', 400);
    }

    const user = await User.findByPk(id);
    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    // Prevent deleting the last super admin
    if (user.is_super_admin) {
      const superAdminCount = await User.count({ where: { is_super_admin: true } });
      if (superAdminCount === 1) {
        return responseHelper.error(res, 'Cannot delete the last super admin', 400);
      }
    }

    // Remove user from all masajids first
    await UserMasjid.destroy({
      where: { user_id: id },
      transaction
    });

    // Delete the user
    await user.destroy({ transaction });

    await transaction.commit();

    logger.info(`User ${id} (${user.email}) deleted by super admin ${req.userId}`);

    return responseHelper.success(res, null, 'User deleted successfully');
  } catch (error) {
    await transaction.rollback();
    logger.error(`Delete user error: ${error.message}`);
    return responseHelper.error(res, 'Failed to delete user', 500);
  }
};

/**
 * Get or generate public API key
 * @route GET /api/super-admin/api-key
 */
exports.getApiKey = async (req, res) => {
  try {
    const apiKey = process.env.PUBLIC_API_KEY || process.env.API_KEY;

    if (!apiKey) {
      // Generate a new API key if not set
      const newApiKey = crypto.randomBytes(32).toString('hex');
      
      logger.warn('⚠️  PUBLIC_API_KEY not set in environment. Generated new key:', newApiKey);
      logger.warn('⚠️  Please add this to your .env file: PUBLIC_API_KEY=' + newApiKey);
      
      return responseHelper.success(res, {
        apiKey: newApiKey,
        message: 'API key generated. Please add PUBLIC_API_KEY to your .env file and restart server.',
        needsSetup: true
      }, 'API key generated. Please configure it in environment variables.');
    }

    return responseHelper.success(res, {
      apiKey: apiKey,
      needsSetup: false
    }, 'API key retrieved successfully');
  } catch (error) {
    logger.error(`Get API key error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve API key', 500);
  }
};

/**
 * Generate a new API key (doesn't save it - just generates for manual setup)
 * @route POST /api/super-admin/api-key/generate
 */
exports.generateApiKey = async (req, res) => {
  try {
    const newApiKey = crypto.randomBytes(32).toString('hex');
    
    logger.info(`New API key generated by super admin ${req.userId}`);
    
    return responseHelper.success(res, {
      apiKey: newApiKey,
      instructions: [
        '1. Add this to your .env file:',
        `   PUBLIC_API_KEY=${newApiKey}`,
        '2. Restart your server',
        '3. Use this key in your frontend app'
      ]
    }, 'API key generated successfully. Please add it to your .env file.');
  } catch (error) {
    logger.error(`Generate API key error: ${error.message}`);
    return responseHelper.error(res, 'Failed to generate API key', 500);
  }
};

/**
 * Send general notification to all imams (Super Admin only)
 * Can optionally filter by masjidId to send to imams of a specific masjid
 * @route POST /api/super-admin/notifications/send-to-imams
 */
exports.sendNotificationToImams = async (req, res) => {
  try {
    const { title, body, masjidId, data = {} } = req.body;

    // Build where clause for finding imams
    const imamWhereClause = {
      role: 'imam'
    };

    // If masjidId is provided, filter by masjid
    if (masjidId) {
      // Validate masjid exists
      const masjid = await Masjid.findByPk(masjidId);
      if (!masjid) {
        return responseHelper.notFound(res, 'Masjid not found');
      }
      imamWhereClause.masjid_id = masjidId;
    }

    // Find all imams (optionally filtered by masjid)
    const imams = await UserMasjid.findAll({
      where: imamWhereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          where: {
            is_active: true
          },
          required: true
        }
      ]
    });

    if (imams.length === 0) {
      const message = masjidId 
        ? 'No active imams found for this masjid'
        : 'No active imams found';
      return responseHelper.success(res, {
        sent: 0,
        total: 0,
        message: message
      }, message);
    }

    // Get user IDs of imams
    const userIds = imams.map(imam => imam.user_id);

    // Get FCM tokens for these imams from MasjidSubscription
    // Get subscriptions for all masjids these imams are subscribed to
    const subscriptions = await MasjidSubscription.findAll({
      where: {
        user_id: { [Op.in]: userIds },
        is_active: true,
        fcm_token: { [Op.ne]: null }
      }
    });

    if (subscriptions.length === 0) {
      logger.info(`No active subscriptions with FCM tokens found for imams`);
      return responseHelper.success(res, {
        sent: 0,
        total: 0,
        message: 'No active subscriptions with FCM tokens found for imams'
      }, 'No imams with active subscriptions to notify');
    }

    // Collect all FCM tokens (deduplicate)
    const fcmTokens = [...new Set(
      subscriptions
        .map(sub => sub.fcm_token)
        .filter(token => token && token.trim() !== '')
    )];

    if (fcmTokens.length === 0) {
      logger.warn(`No valid FCM tokens found for imams`);
      return responseHelper.success(res, {
        sent: 0,
        total: 0,
        message: 'No valid FCM tokens found'
      }, 'No valid tokens to send notifications');
    }

    // Prepare notification data
    const notificationData = {
      category: 'General',
      type: 'super_admin_notification',
      ...data
    };

    if (masjidId) {
      notificationData.masjidId = masjidId;
    }

    // Send push notifications in batch
    const result = await pushNotificationService.sendBatchPushNotifications(
      fcmTokens,
      title,
      body,
      notificationData
    );

    if (result.success) {
      logger.info(`Super admin notification sent to imams: ${result.successful} successful, ${result.failed} failed`);
      
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
                fcm_token: { [Op.in]: invalidTokens }
              }
            }
          );
          logger.info(`Deactivated ${invalidTokens.length} subscriptions with invalid FCM tokens`);
        }
      }

      // Include error details in response if there are failures
      const responseData = {
        sent: result.successful,
        failed: result.failed,
        total: result.total,
        imamsFound: imams.length,
        masjidId: masjidId || null
      };

      // Add error details if there are failures (for debugging)
      if (result.failed > 0 && result.results) {
        const failedResults = result.results.filter(r => !r.success);
        responseData.failureDetails = failedResults.map(r => ({
          code: r.error?.code || 'unknown',
          message: r.error?.message || r.error || 'Unknown error'
        }));
      }

      return responseHelper.success(res, responseData, `Notification sent to imams: ${result.successful} successful, ${result.failed} failed`);
    } else {
      logger.error(`Failed to send notification to imams: ${result.error}`, {
        masjidId,
        code: result.code,
        error: result.error
      });
      return responseHelper.error(res, `Failed to send notification to imams: ${result.error}`, 500, {
        code: result.code,
        details: result.originalError
      });
    }
  } catch (error) {
    logger.error(`Send notification to imams error: ${error.message}`);
    return responseHelper.error(res, 'Failed to send notification to imams', 500);
  }
};

/**
 * Get imam subscription status with FCM tokens (Super Admin only)
 * Shows all imams and their subscription status
 * @route GET /api/super-admin/imams/subscriptions
 */
exports.getImamSubscriptions = async (req, res) => {
  try {
    const { masjidId } = req.query;

    // Build where clause for finding imams
    const imamWhereClause = {
      role: 'imam'
    };

    // If masjidId is provided, filter by masjid
    if (masjidId) {
      // Validate masjid exists
      const masjid = await Masjid.findByPk(masjidId);
      if (!masjid) {
        return responseHelper.notFound(res, 'Masjid not found');
      }
      imamWhereClause.masjid_id = masjidId;
    }

    // Find all imams (optionally filtered by masjid)
    const imams = await UserMasjid.findAll({
      where: imamWhereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'is_active'],
          where: {
            is_active: true
          },
          required: true
        },
        {
          model: Masjid,
          as: 'masjid',
          attributes: ['id', 'name', 'city'],
          required: true
        }
      ],
      order: [['masjid_id', 'ASC'], ['assigned_at', 'DESC']]
    });

    if (imams.length === 0) {
      const message = masjidId 
        ? 'No active imams found for this masjid'
        : 'No active imams found';
      return responseHelper.success(res, {
        imams: [],
        total: 0,
        message: message
      }, message);
    }

    // Get user IDs of imams
    const userIds = imams.map(imam => imam.user_id);

    // Get all subscriptions for these imams
    const subscriptions = await MasjidSubscription.findAll({
      where: {
        user_id: { [Op.in]: userIds }
      },
      include: [
        {
          model: Masjid,
          as: 'masjid',
          attributes: ['id', 'name', 'city'],
          required: false
        }
      ],
      order: [['masjid_id', 'ASC']]
    });

    // Group subscriptions by user_id
    const subscriptionsByUser = {};
    subscriptions.forEach(sub => {
      if (!subscriptionsByUser[sub.user_id]) {
        subscriptionsByUser[sub.user_id] = [];
      }
      subscriptionsByUser[sub.user_id].push(sub);
    });

    // Format response with subscription details
    const imamsWithSubscriptions = imams.map(imam => {
      const userSubscriptions = subscriptionsByUser[imam.user_id] || [];
      const activeSubscriptions = userSubscriptions.filter(sub => sub.is_active);
      const subscriptionsWithFcm = activeSubscriptions.filter(sub => sub.fcm_token && sub.fcm_token.trim() !== '');

      return {
        imamId: imam.user.id,
        imamName: imam.user.name,
        imamEmail: imam.user.email,
        masjidId: imam.masjid.id,
        masjidName: imam.masjid.name,
        masjidCity: imam.masjid.city,
        hasSubscriptions: userSubscriptions.length > 0,
        totalSubscriptions: userSubscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
        subscriptionsWithFcm: subscriptionsWithFcm.length,
        hasFcmToken: subscriptionsWithFcm.length > 0,
        subscriptions: userSubscriptions.map(sub => ({
          id: sub.id,
          masjidId: sub.masjid_id,
          masjidName: sub.masjid?.name || 'N/A',
          isActive: sub.is_active,
          hasFcmToken: !!(sub.fcm_token && sub.fcm_token.trim() !== ''),
          fcmTokenPreview: sub.fcm_token 
            ? `${sub.fcm_token.substring(0, 20)}...${sub.fcm_token.substring(sub.fcm_token.length - 10)}`
            : null,
          createdAt: sub.created_at,
          updatedAt: sub.updated_at
        }))
      };
    });

    // Summary statistics
    const summary = {
      totalImams: imamsWithSubscriptions.length,
      imamsWithSubscriptions: imamsWithSubscriptions.filter(i => i.hasSubscriptions).length,
      imamsWithActiveSubscriptions: imamsWithSubscriptions.filter(i => i.activeSubscriptions > 0).length,
      imamsWithFcmTokens: imamsWithSubscriptions.filter(i => i.hasFcmToken).length,
      imamsWithoutFcmTokens: imamsWithSubscriptions.filter(i => !i.hasFcmToken).length
    };

    return responseHelper.success(res, {
      summary,
      imams: imamsWithSubscriptions
    }, 'Imam subscription status retrieved successfully');
  } catch (error) {
    logger.error(`Get imam subscriptions error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve imam subscriptions', 500);
  }
};

/**
 * Add or update FCM token for imam subscription (Super Admin only)
 * Creates subscription if it doesn't exist, or updates existing one
 * @route POST /api/super-admin/imams/:imamId/subscription
 */
exports.addImamFcmToken = async (req, res) => {
  try {
    const { imamId } = req.params;
    const { masjidId, fcmToken } = req.body;

    // Validate inputs
    if (!masjidId || !fcmToken) {
      return responseHelper.error(res, 'Masjid ID and FCM token are required', 400);
    }

    // Validate imam exists and is actually an imam
    const imam = await UserMasjid.findOne({
      where: {
        user_id: imamId,
        role: 'imam'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'is_active']
        }
      ]
    });

    if (!imam) {
      return responseHelper.notFound(res, 'Imam not found or user is not an imam');
    }

    if (!imam.user.is_active) {
      return responseHelper.error(res, 'Imam account is not active', 400);
    }

    // Validate masjid exists
    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    // Check if subscription already exists
    let subscription = await MasjidSubscription.findOne({
      where: {
        masjid_id: masjidId,
        user_id: imamId
      }
    });

    if (subscription) {
      // Update existing subscription
      subscription.fcm_token = fcmToken;
      subscription.is_active = true;
      await subscription.save();
      
      logger.info(`FCM token updated for imam ${imamId}, masjid ${masjidId} by super admin ${req.userId}`);
      
      return responseHelper.success(res, {
        subscription: subscription,
        imam: {
          id: imam.user.id,
          name: imam.user.name,
          email: imam.user.email
        },
        masjid: {
          id: masjid.id,
          name: masjid.name
        }
      }, 'FCM token updated successfully');
    } else {
      // Create new subscription
      subscription = await MasjidSubscription.create({
        masjid_id: masjidId,
        user_id: imamId,
        device_id: null,
        fcm_token: fcmToken,
        is_active: true
      });

      logger.info(`Subscription created with FCM token for imam ${imamId}, masjid ${masjidId} by super admin ${req.userId}`);

      return responseHelper.success(res, {
        subscription: subscription,
        imam: {
          id: imam.user.id,
          name: imam.user.name,
          email: imam.user.email
        },
        masjid: {
          id: masjid.id,
          name: masjid.name
        }
      }, 'Subscription created with FCM token successfully', 201);
    }
  } catch (error) {
    logger.error(`Add imam FCM token error: ${error.message}`);
    return responseHelper.error(res, 'Failed to add FCM token', 500);
  }
};

/**
 * Get app configuration (Super Admin only)
 * @route GET /api/super-admin/config/app
 */
exports.getAppConfig = async (req, res) => {
  try {
    const config = await AppConfig.findOne({
      where: { key: 'max_favorites_limit' }
    });

    const maxFavoritesLimit = config ? parseInt(config.value, 10) : 5;

    return responseHelper.success(res, {
      maxFavoritesLimit
    }, 'Configuration retrieved successfully');
  } catch (error) {
    logger.error(`Get app config error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve configuration', 500);
  }
};

/**
 * Update app configuration (Super Admin only)
 * @route PUT /api/super-admin/config/app
 */
exports.updateAppConfig = async (req, res) => {
  try {
    const { maxFavoritesLimit } = req.body;

    // Validate input
    if (!maxFavoritesLimit || typeof maxFavoritesLimit !== 'number' || maxFavoritesLimit < 1 || maxFavoritesLimit > 20) {
      return responseHelper.error(res, 'maxFavoritesLimit must be a number between 1 and 20', 400);
    }

    // Find or create config
    let config = await AppConfig.findOne({
      where: { key: 'max_favorites_limit' }
    });

    if (config) {
      // Update existing config
      config.value = maxFavoritesLimit.toString();
      config.updated_by = req.userId;
      await config.save();
    } else {
      // Create new config
      config = await AppConfig.create({
        key: 'max_favorites_limit',
        value: maxFavoritesLimit.toString(),
        description: 'Maximum number of masjids a user can add to favorites',
        updated_by: req.userId
      });
    }

    logger.info(`App config updated by super admin ${req.userId}: maxFavoritesLimit = ${maxFavoritesLimit}`);

    return responseHelper.success(res, {
      maxFavoritesLimit: parseInt(config.value, 10)
    }, 'Configuration updated successfully');
  } catch (error) {
    logger.error(`Update app config error: ${error.message}`);
    return responseHelper.error(res, 'Failed to update configuration', 500);
  }
};

