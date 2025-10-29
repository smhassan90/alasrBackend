const { User, Masjid, UserMasjid } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
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

