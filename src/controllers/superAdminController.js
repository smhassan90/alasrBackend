const { User, Masjid, UserMasjid, sequelize } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Op } = require('sequelize');

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

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires', 'email_verification_token'] },
      include: [
        {
          model: UserMasjid,
          as: 'userMasajids',
          include: [
            {
              model: Masjid,
              as: 'masjid',
              attributes: ['id', 'name', 'city']
            }
          ]
        }
      ]
    });

    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    return responseHelper.success(res, user, 'User retrieved successfully');
  } catch (error) {
    logger.error(`Get user by ID error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve user', 500);
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      is_super_admin,
      is_active: true,
      email_verified: true // Auto-verify for super admin created users
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

