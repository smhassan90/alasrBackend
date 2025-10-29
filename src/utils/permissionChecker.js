const { UserMasjid, User } = require('../models');

/**
 * Check if user is super admin
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
exports.isSuperAdmin = async (userId) => {
  const user = await User.findByPk(userId);
  return user && user.is_super_admin;
};

/**
 * Check if user is a member of masjid (any role)
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.isMasjidMember = async (userId, masjidId) => {
  // Super admin has access to all masajids
  if (await exports.isSuperAdmin(userId)) {
    return true;
  }
  
  const association = await UserMasjid.findOne({
    where: { user_id: userId, masjid_id: masjidId }
  });
  return !!association;
};

/**
 * Check if user has specific role for masjid
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @param {string} role - Role to check ('imam' or 'admin')
 * @returns {Promise<boolean>}
 */
exports.hasRole = async (userId, masjidId, role) => {
  if (await exports.isSuperAdmin(userId)) {
    return true;
  }
  
  const association = await UserMasjid.findOne({
    where: { user_id: userId, masjid_id: masjidId, role }
  });
  return !!association;
};

/**
 * Check if user is an imam for masjid
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.isMasjidImam = async (userId, masjidId) => {
  return await exports.hasRole(userId, masjidId, 'imam');
};

/**
 * Check if user is an admin for masjid
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.isMasjidAdmin = async (userId, masjidId) => {
  return await exports.hasRole(userId, masjidId, 'admin');
};

/**
 * Check if user is imam OR admin for masjid
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.isMasjidImamOrAdmin = async (userId, masjidId) => {
  if (await exports.isSuperAdmin(userId)) {
    return true;
  }
  
  const association = await UserMasjid.findOne({
    where: { 
      user_id: userId, 
      masjid_id: masjidId 
    }
  });
  return !!association;
};

/**
 * Get user roles for masjid
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<Array<string>>}
 */
exports.getUserRoles = async (userId, masjidId) => {
  const associations = await UserMasjid.findAll({
    where: { user_id: userId, masjid_id: masjidId },
    attributes: ['role']
  });
  return associations.map(a => a.role);
};

/**
 * Get user permissions for masjid
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<Object>}
 */
exports.getUserPermissions = async (userId, masjidId) => {
  // Super admin has all permissions
  if (await exports.isSuperAdmin(userId)) {
    return {
      can_view_complaints: true,
      can_answer_complaints: true,
      can_view_questions: true,
      can_answer_questions: true,
      can_change_prayer_times: true,
      can_create_events: true,
      can_create_notifications: true
    };
  }

  const association = await UserMasjid.findOne({
    where: { user_id: userId, masjid_id: masjidId }
  });

  if (!association) {
    return {
      can_view_complaints: false,
      can_answer_complaints: false,
      can_view_questions: false,
      can_answer_questions: false,
      can_change_prayer_times: false,
      can_create_events: false,
      can_create_notifications: false
    };
  }

  return {
    can_view_complaints: association.can_view_complaints,
    can_answer_complaints: association.can_answer_complaints,
    can_view_questions: association.can_view_questions,
    can_answer_questions: association.can_answer_questions,
    can_change_prayer_times: association.can_change_prayer_times,
    can_create_events: association.can_create_events,
    can_create_notifications: association.can_create_notifications
  };
};

/**
 * Check specific permission
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @param {string} permission - Permission name
 * @returns {Promise<boolean>}
 */
exports.hasPermission = async (userId, masjidId, permission) => {
  // Super admin has all permissions
  if (await exports.isSuperAdmin(userId)) {
    return true;
  }

  const association = await UserMasjid.findOne({
    where: { user_id: userId, masjid_id: masjidId }
  });

  if (!association) {
    return false;
  }

  return association[permission] === true;
};

/**
 * Check if user can manage prayer times (imam or admin)
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.canManagePrayerTimes = async (userId, masjidId) => {
  return await exports.hasPermission(userId, masjidId, 'can_change_prayer_times');
};

/**
 * Check if user can manage masjid (admin only)
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.canManageMasjid = async (userId, masjidId) => {
  if (await exports.isSuperAdmin(userId)) {
    return true;
  }
  return await exports.isMasjidAdmin(userId, masjidId);
};

/**
 * Check if user can manage users (admin only)
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.canManageUsers = async (userId, masjidId) => {
  if (await exports.isSuperAdmin(userId)) {
    return true;
  }
  return await exports.isMasjidAdmin(userId, masjidId);
};

/**
 * Check if user can view questions
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.canViewQuestions = async (userId, masjidId) => {
  return await exports.hasPermission(userId, masjidId, 'can_view_questions');
};

/**
 * Check if user can answer questions
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.canAnswerQuestions = async (userId, masjidId) => {
  return await exports.hasPermission(userId, masjidId, 'can_answer_questions');
};

/**
 * Check if user can view complaints
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.canViewComplaints = async (userId, masjidId) => {
  return await exports.hasPermission(userId, masjidId, 'can_view_complaints');
};

/**
 * Check if user can answer complaints
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.canAnswerComplaints = async (userId, masjidId) => {
  return await exports.hasPermission(userId, masjidId, 'can_answer_complaints');
};

/**
 * Check if user can create events
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.canCreateEvents = async (userId, masjidId) => {
  return await exports.hasPermission(userId, masjidId, 'can_create_events');
};

/**
 * Check if user can create notifications
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.canCreateNotifications = async (userId, masjidId) => {
  return await exports.hasPermission(userId, masjidId, 'can_create_notifications');
};

/**
 * Count admins for a masjid
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<number>}
 */
exports.countMasjidAdmins = async (masjidId) => {
  return await UserMasjid.count({
    where: { masjid_id: masjidId, role: 'admin' }
  });
};

/**
 * Check if user is the last admin of masjid
 * @param {string} userId - User ID
 * @param {string} masjidId - Masjid ID
 * @returns {Promise<boolean>}
 */
exports.isLastAdmin = async (userId, masjidId) => {
  const isAdmin = await exports.isMasjidAdmin(userId, masjidId);
  if (!isAdmin) return false;
  
  const adminCount = await exports.countMasjidAdmins(masjidId);
  return adminCount === 1;
};
