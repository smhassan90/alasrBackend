const { User, UserSettings, Masjid, UserMasjid } = require('../models');
const responseHelper = require('../utils/responseHelper');
const uploadHelper = require('../middleware/upload');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Get user profile
 * @route GET /api/users/profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      include: [
        {
          model: UserSettings,
          as: 'settings'
        }
      ],
      attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires', 'email_verification_token'] }
    });

    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    return responseHelper.success(res, user, 'Profile retrieved successfully');
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve profile', 500);
  }
};

/**
 * Update user profile
 * @route PUT /api/users/profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const user = await User.findByPk(req.userId);
    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    // Update fields
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    logger.info(`Profile updated for user: ${user.email}`);

    return responseHelper.success(res, user.toSafeObject(), 'Profile updated successfully');
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    return responseHelper.error(res, 'Failed to update profile', 500);
  }
};

/**
 * Upload profile picture
 * @route POST /api/users/profile/picture
 */
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return responseHelper.error(res, 'No file uploaded', 400);
    }

    const user = await User.findByPk(req.userId);
    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    // Delete old profile picture if exists
    if (user.profile_picture) {
      const oldFilename = user.profile_picture.split('/').pop();
      uploadHelper.deleteFile(`${uploadHelper.uploadDir}/${oldFilename}`);
    }

    // Save new profile picture URL
    user.profile_picture = uploadHelper.getFileUrl(req.file.filename);
    await user.save();

    logger.info(`Profile picture uploaded for user: ${user.email}`);

    return responseHelper.success(res, {
      profile_picture: user.profile_picture
    }, 'Profile picture uploaded successfully');
  } catch (error) {
    logger.error(`Upload profile picture error: ${error.message}`);
    return responseHelper.error(res, 'Failed to upload profile picture', 500);
  }
};

/**
 * Delete profile picture
 * @route DELETE /api/users/profile/picture
 */
exports.deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    if (!user.profile_picture) {
      return responseHelper.error(res, 'No profile picture to delete', 400);
    }

    // Delete file
    const filename = user.profile_picture.split('/').pop();
    uploadHelper.deleteFile(`${uploadHelper.uploadDir}/${filename}`);

    // Remove from database
    user.profile_picture = null;
    await user.save();

    logger.info(`Profile picture deleted for user: ${user.email}`);

    return responseHelper.success(res, null, 'Profile picture deleted successfully');
  } catch (error) {
    logger.error(`Delete profile picture error: ${error.message}`);
    return responseHelper.error(res, 'Failed to delete profile picture', 500);
  }
};

/**
 * Change password
 * @route POST /api/users/change-password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(req.userId);
    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return responseHelper.error(res, 'Current password is incorrect', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info(`Password changed for user: ${user.email}`);

    return responseHelper.success(res, null, 'Password changed successfully');
  } catch (error) {
    logger.error(`Change password error: ${error.message}`);
    return responseHelper.error(res, 'Failed to change password', 500);
  }
};

/**
 * Delete user account
 * @route DELETE /api/users/account
 */
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return responseHelper.notFound(res, 'User not found');
    }

    // Soft delete - deactivate account
    user.is_active = false;
    await user.save();

    logger.info(`Account deleted for user: ${user.email}`);

    return responseHelper.success(res, null, 'Account deleted successfully');
  } catch (error) {
    logger.error(`Delete account error: ${error.message}`);
    return responseHelper.error(res, 'Failed to delete account', 500);
  }
};

/**
 * Get user notification settings
 * @route GET /api/users/settings
 */
exports.getSettings = async (req, res) => {
  try {
    let settings = await UserSettings.findOne({
      where: { user_id: req.userId }
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await UserSettings.create({
        user_id: req.userId
      });
    }

    return responseHelper.success(res, settings, 'Settings retrieved successfully');
  } catch (error) {
    logger.error(`Get settings error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve settings', 500);
  }
};

/**
 * Update user notification settings
 * @route PUT /api/users/settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const {
      prayer_times_notifications,
      events_notifications,
      donations_notifications,
      general_notifications,
      questions_notifications
    } = req.body;

    let settings = await UserSettings.findOne({
      where: { user_id: req.userId }
    });

    if (!settings) {
      settings = await UserSettings.create({
        user_id: req.userId
      });
    }

    // Update settings
    if (prayer_times_notifications !== undefined) settings.prayer_times_notifications = prayer_times_notifications;
    if (events_notifications !== undefined) settings.events_notifications = events_notifications;
    if (donations_notifications !== undefined) settings.donations_notifications = donations_notifications;
    if (general_notifications !== undefined) settings.general_notifications = general_notifications;
    if (questions_notifications !== undefined) settings.questions_notifications = questions_notifications;

    await settings.save();

    logger.info(`Settings updated for user: ${req.userId}`);

    return responseHelper.success(res, settings, 'Settings updated successfully');
  } catch (error) {
    logger.error(`Update settings error: ${error.message}`);
    return responseHelper.error(res, 'Failed to update settings', 500);
  }
};

/**
 * Get all masajids user is associated with
 * @route GET /api/users/masajids
 */
exports.getUserMasajids = async (req, res) => {
  try {
    const userMasajids = await UserMasjid.findAll({
      where: { user_id: req.userId },
      include: [
        {
          model: Masjid,
          as: 'masjid',
          where: { is_active: true }
        }
      ]
    });

    // Group by masjid and collect roles
    const masajidsMap = {};
    userMasajids.forEach(um => {
      const masjidId = um.masjid.id;
      if (!masajidsMap[masjidId]) {
        masajidsMap[masjidId] = {
          masjidId: um.masjid.id,
          name: um.masjid.name,
          location: um.masjid.location,
          address: um.masjid.address,
          city: um.masjid.city,
          state: um.masjid.state,
          country: um.masjid.country,
          roles: [],
          isDefault: um.is_default
        };
      }
      masajidsMap[masjidId].roles.push(um.role);
      if (um.is_default) {
        masajidsMap[masjidId].isDefault = true;
      }
    });

    const masajids = Object.values(masajidsMap);

    return responseHelper.success(res, masajids, 'Masajids retrieved successfully');
  } catch (error) {
    logger.error(`Get user masajids error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve masajids', 500);
  }
};

