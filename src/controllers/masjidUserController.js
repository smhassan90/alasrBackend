const { UserMasjid, User, Masjid, sequelize } = require('../models');
const responseHelper = require('../utils/responseHelper');
const permissionChecker = require('../utils/permissionChecker');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');

/**
 * Add user to masjid (as imam or admin)
 * @route POST /api/masajids/:id/users
 */
exports.addUserToMasjid = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id: masjidId } = req.params;
    const { userId, role, permissions } = req.body;

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    // Check if masjid exists
    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    // Check if user is already associated with this role
    const existingAssociation = await UserMasjid.findOne({
      where: {
        user_id: userId,
        masjid_id: masjidId,
        role
      }
    });

    if (existingAssociation) {
      return responseHelper.error(res, `User is already ${role} of this masjid`, 400);
    }

    // Prevent user from adding themselves
    if (userId === req.userId) {
      return responseHelper.forbidden(res, 'You cannot add yourself to a masjid');
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

    // Create association with permissions
    const userMasjid = await UserMasjid.create({
      user_id: userId,
      masjid_id: masjidId,
      role,
      assigned_by: req.userId,
      ...defaultPermissions
    }, { transaction });

    await transaction.commit();

    // Get admin name for email
    const admin = await User.findByPk(req.userId);

    // Send invitation email (async, don't wait)
    emailService.sendMasjidInvitationEmail(user.email, masjid.name, role, admin.name).catch(err =>
      logger.error(`Failed to send invitation email: ${err.message}`)
    );

    logger.info(`User ${userId} added to masjid ${masjidId} as ${role} by ${req.userId}`);

    return responseHelper.success(res, userMasjid, 'User added to masjid successfully', 201);
  } catch (error) {
    await transaction.rollback();
    logger.error(`Add user to masjid error: ${error.message}`);
    return responseHelper.error(res, 'Failed to add user to masjid', 500);
  }
};

/**
 * Remove user from masjid
 * @route DELETE /api/masajids/:id/users/:userId
 */
exports.removeUserFromMasjid = async (req, res) => {
  try {
    const { id: masjidId, userId } = req.params;

    // Prevent user from removing themselves
    if (userId === req.userId) {
      return responseHelper.forbidden(res, 'You cannot remove yourself from a masjid. Please transfer ownership first or ask another admin.');
    }

    // Check if user is the last admin
    const isLastAdmin = await permissionChecker.isLastAdmin(userId, masjidId);
    if (isLastAdmin) {
      return responseHelper.forbidden(res, 'Cannot remove the last admin. Please add another admin first.');
    }

    // Get user and masjid for email
    const user = await User.findByPk(userId);
    const masjid = await Masjid.findByPk(masjidId);
    const admin = await User.findByPk(req.userId);

    // Remove all associations (both imam and admin roles)
    const deleted = await UserMasjid.destroy({
      where: {
        user_id: userId,
        masjid_id: masjidId
      }
    });

    if (deleted === 0) {
      return responseHelper.notFound(res, 'User is not a member of this masjid');
    }

    // Send removal email (async, don't wait)
    if (user && masjid && admin) {
      emailService.sendMasjidRemovalEmail(user.email, masjid.name, admin.name).catch(err =>
        logger.error(`Failed to send removal email: ${err.message}`)
      );
    }

    logger.info(`User ${userId} removed from masjid ${masjidId} by ${req.userId}`);

    return responseHelper.success(res, null, 'User removed from masjid successfully');
  } catch (error) {
    logger.error(`Remove user from masjid error: ${error.message}`);
    return responseHelper.error(res, 'Failed to remove user from masjid', 500);
  }
};

/**
 * Update user role in masjid
 * @route PUT /api/masajids/:id/users/:userId/role
 */
exports.updateUserRole = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id: masjidId, userId } = req.params;
    const { role } = req.body;

    // Prevent user from modifying their own role
    if (userId === req.userId) {
      return responseHelper.forbidden(res, 'You cannot modify your own role');
    }

    // Find existing association
    const userMasjid = await UserMasjid.findOne({
      where: {
        user_id: userId,
        masjid_id: masjidId
      }
    });

    if (!userMasjid) {
      return responseHelper.notFound(res, 'User is not a member of this masjid');
    }

    // If changing from admin to imam, check if they're the last admin
    if (userMasjid.role === 'admin' && role === 'imam') {
      const isLastAdmin = await permissionChecker.isLastAdmin(userId, masjidId);
      if (isLastAdmin) {
        return responseHelper.forbidden(res, 'Cannot change role of the last admin');
      }
    }

    // Check if new role association already exists
    const existingNewRole = await UserMasjid.findOne({
      where: {
        user_id: userId,
        masjid_id: masjidId,
        role
      }
    });

    if (existingNewRole) {
      return responseHelper.error(res, `User already has ${role} role for this masjid`, 400);
    }

    // Update role
    userMasjid.role = role;
    await userMasjid.save({ transaction });

    await transaction.commit();

    logger.info(`User ${userId} role updated to ${role} in masjid ${masjidId} by ${req.userId}`);

    return responseHelper.success(res, userMasjid, 'User role updated successfully');
  } catch (error) {
    await transaction.rollback();
    logger.error(`Update user role error: ${error.message}`);
    return responseHelper.error(res, 'Failed to update user role', 500);
  }
};

/**
 * Get all imams of a masjid
 * @route GET /api/masajids/:id/imams
 */
exports.getImams = async (req, res) => {
  try {
    const { id: masjidId } = req.params;

    const imams = await UserMasjid.findAll({
      where: {
        masjid_id: masjidId,
        role: 'imam'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'profile_picture']
        }
      ],
      order: [['assigned_at', 'DESC']]
    });

    const imamList = imams.map(imam => ({
      id: imam.user.id,
      name: imam.user.name,
      email: imam.user.email,
      phone: imam.user.phone,
      profile_picture: imam.user.profile_picture,
      assignedAt: imam.assigned_at
    }));

    return responseHelper.success(res, imamList, 'Imams retrieved successfully');
  } catch (error) {
    logger.error(`Get imams error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve imams', 500);
  }
};

/**
 * Get all admins of a masjid
 * @route GET /api/masajids/:id/admins
 */
exports.getAdmins = async (req, res) => {
  try {
    const { id: masjidId } = req.params;

    const admins = await UserMasjid.findAll({
      where: {
        masjid_id: masjidId,
        role: 'admin'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone', 'profile_picture']
        }
      ],
      order: [['assigned_at', 'DESC']]
    });

    const adminList = admins.map(admin => ({
      id: admin.user.id,
      name: admin.user.name,
      email: admin.user.email,
      phone: admin.user.phone,
      profile_picture: admin.user.profile_picture,
      assignedAt: admin.assigned_at
    }));

    return responseHelper.success(res, adminList, 'Admins retrieved successfully');
  } catch (error) {
    logger.error(`Get admins error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve admins', 500);
  }
};

/**
 * Transfer primary admin ownership to another user
 * @route POST /api/masajids/:id/transfer-ownership
 */
exports.transferOwnership = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id: masjidId } = req.params;
    const { newAdminId } = req.body;

    // Check if new admin exists
    const newAdmin = await User.findByPk(newAdminId);
    if (!newAdmin) {
      return responseHelper.notFound(res, 'New admin user not found');
    }

    // Check if new admin is already admin of this masjid
    const isAdmin = await permissionChecker.isMasjidAdmin(newAdminId, masjidId);
    if (!isAdmin) {
      return responseHelper.error(res, 'New admin must already be an admin of this masjid', 400);
    }

    // Update masjid creator
    const masjid = await Masjid.findByPk(masjidId);
    masjid.created_by = newAdminId;
    await masjid.save({ transaction });

    await transaction.commit();

    logger.info(`Ownership transferred for masjid ${masjidId} from ${req.userId} to ${newAdminId}`);

    return responseHelper.success(res, null, 'Ownership transferred successfully');
  } catch (error) {
    await transaction.rollback();
    logger.error(`Transfer ownership error: ${error.message}`);
    return responseHelper.error(res, 'Failed to transfer ownership', 500);
  }
};

