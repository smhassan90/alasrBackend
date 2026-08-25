const { randomUUID } = require('crypto');
const { Op } = require('sequelize');
const { ActivityLog, User, Masjid, sequelize } = require('../models');
const logger = require('../utils/logger');
const { ensureActivityLogsTable } = require('../utils/ensureActivityLogsTable');

const RETENTION_DAYS = 7;

const ACTIONS = {
  PRAYER_TIME_UPDATED: 'prayer_time_updated',
  EVENT_CREATED: 'event_created',
  QUESTION_ANSWERED: 'question_answered',
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DELETED: 'user_deleted',
  USER_PROMOTED: 'user_promoted',
  USER_DEMOTED: 'user_demoted',
  USER_ACTIVATED: 'user_activated',
  USER_DEACTIVATED: 'user_deactivated',
  MEMBER_ADDED: 'member_added',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_ROLE_UPDATED: 'member_role_updated',
  MASJID_CREATED: 'masjid_created',
  MASJID_UPDATED: 'masjid_updated',
  MASJID_DEACTIVATED: 'masjid_deactivated'
};

function retentionCutoff() {
  return new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function formatClock(time) {
  if (time == null || time === '') {
    return '';
  }
  if (time instanceof Date && !Number.isNaN(time.getTime())) {
    return time.toISOString().slice(11, 16);
  }
  const match = String(time).match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    return String(time).slice(0, 5);
  }
  return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
}

function emptyResult(page, limit) {
  return {
    logs: [],
    pagination: {
      page,
      limit,
      totalItems: 0
    }
  };
}

function parseMetadata(value) {
  if (!value) {
    return null;
  }
  if (typeof value === 'object') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

function serializeLog(log) {
  const json = typeof log.toJSON === 'function' ? log.toJSON() : log;
  return {
    id: json.id,
    masjid_id: json.masjid_id,
    user_id: json.user_id,
    action: json.action,
    message: json.message,
    metadata: parseMetadata(json.metadata),
    created_at: json.created_at || json.createdAt,
    user: json.user
      ? { id: json.user.id, name: json.user.name }
      : json.user_name
        ? { id: json.user_id, name: json.user_name }
        : null,
    masjid: json.masjid
      ? { id: json.masjid.id, name: json.masjid.name }
      : json.masjid_name
        ? { id: json.masjid_id, name: json.masjid_name }
        : null
  };
}

async function insertLogRaw({ masjidId, userId, action, message, metadata }) {
  const id = randomUUID();
  const meta = metadata == null ? null : JSON.stringify(metadata);
  try {
    await sequelize.query(
      `INSERT INTO activity_logs
        (id, masjid_id, user_id, action, message, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      {
        replacements: [id, masjidId, userId || null, action, String(message).slice(0, 500), meta]
      }
    );
    return id;
  } catch (error) {
    if (userId) {
      logger.error(`Activity log insert failed (${error.message}); retrying without user_id`);
      await sequelize.query(
        `INSERT INTO activity_logs
          (id, masjid_id, user_id, action, message, metadata, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, ?, NOW(), NOW())`,
        {
          replacements: [id, masjidId, action, String(message).slice(0, 500), meta]
        }
      );
      return id;
    }
    throw error;
  }
}

async function pruneOldLogs() {
  try {
    await ensureActivityLogsTable(sequelize);
    const [result] = await sequelize.query(
      'DELETE FROM activity_logs WHERE created_at < ?',
      { replacements: [retentionCutoff()] }
    );
    const deleted = result?.affectedRows || 0;
    if (deleted > 0) {
      logger.info(`Pruned ${deleted} activity logs older than ${RETENTION_DAYS} days`);
    }
    return deleted;
  } catch (error) {
    logger.error(`Failed to prune activity logs: ${error.message}`);
    return 0;
  }
}

async function logActivity({ masjidId, userId, action, message, metadata }) {
  try {
    if (!action || !message) {
      logger.error('Skipped activity log: missing action or message');
      return null;
    }
    await ensureActivityLogsTable(sequelize);
    try {
      const log = await ActivityLog.create({
        masjid_id: masjidId || null,
        user_id: userId || null,
        action,
        message: String(message).slice(0, 500),
        metadata: metadata || null
      });
      pruneOldLogs().catch(() => {});
      return log;
    } catch (error) {
      logger.error(`Sequelize activity log write failed: ${error.message}`);
      await insertLogRaw({ masjidId: masjidId || null, userId, action, message, metadata });
      pruneOldLogs().catch(() => {});
      return { id: true };
    }
  } catch (error) {
    logger.error(`Failed to write activity log: ${error.message}`);
    return null;
  }
}

function logPrayerTimeUpdate({ masjidId, userId, actorName, prayerName, prayerTime }) {
  const name = actorName || 'A user';
  const clock = formatClock(prayerTime);
  return logActivity({
    masjidId,
    userId,
    action: ACTIONS.PRAYER_TIME_UPDATED,
    message: `${name} updated ${prayerName} time to ${clock}`,
    metadata: { prayerName, prayerTime: clock }
  });
}

function logEventCreated({ masjidId, userId, actorName, eventName }) {
  const name = actorName || 'A user';
  return logActivity({
    masjidId,
    userId,
    action: ACTIONS.EVENT_CREATED,
    message: `${name} created event "${eventName}"`,
    metadata: { eventName }
  });
}

function logQuestionAnswered({ masjidId, userId, actorName, questionTitle }) {
  const name = actorName || 'A user';
  const title = questionTitle || 'a question';
  return logActivity({
    masjidId,
    userId,
    action: ACTIONS.QUESTION_ANSWERED,
    message: `${name} answered "${title}"`,
    metadata: { questionTitle: title }
  });
}

function logAdminAction({ masjidId, userId, action, message, metadata }) {
  return logActivity({
    masjidId: masjidId || null,
    userId,
    action,
    message,
    metadata
  });
}

function logUserCreated({ userId, actorName, targetName, targetEmail, masjidId, masjidName, role }) {
  const name = actorName || 'A super admin';
  const target = targetName || targetEmail || 'a user';
  let message = `${name} created user "${target}"`;
  if (targetEmail && targetName) {
    message = `${name} created user "${targetName}" (${targetEmail})`;
  }
  if (masjidName && role) {
    message += ` and added them as ${role} of ${masjidName}`;
  }
  return logAdminAction({
    masjidId,
    userId,
    action: ACTIONS.USER_CREATED,
    message,
    metadata: { targetName, targetEmail, masjidName, role }
  });
}

function logUserUpdated({ userId, actorName, targetName, masjidId }) {
  const name = actorName || 'A super admin';
  return logAdminAction({
    masjidId,
    userId,
    action: ACTIONS.USER_UPDATED,
    message: `${name} updated user "${targetName || 'a user'}"`,
    metadata: { targetName }
  });
}

function logUserDeleted({ userId, actorName, targetName, targetEmail }) {
  const name = actorName || 'A super admin';
  const target = targetName || 'a user';
  const emailPart = targetEmail ? ` (${targetEmail})` : '';
  return logAdminAction({
    userId,
    action: ACTIONS.USER_DELETED,
    message: `${name} deleted user "${target}"${emailPart}`,
    metadata: { targetName, targetEmail }
  });
}

function logUserStatusChanged({ userId, actorName, targetName, action, label, description }) {
  const name = actorName || 'A super admin';
  return logAdminAction({
    userId,
    action,
    message: `${name} ${label || description}`,
    metadata: { targetName }
  });
}

function logMemberAdded({ masjidId, userId, actorName, targetName, masjidName, role }) {
  const name = actorName || 'A user';
  return logAdminAction({
    masjidId,
    userId,
    action: ACTIONS.MEMBER_ADDED,
    message: `${name} added ${targetName || 'a user'} as ${role || 'a member'} of ${masjidName || 'a masjid'}`,
    metadata: { targetName, masjidName, role }
  });
}

function logMemberRemoved({ masjidId, userId, actorName, targetName, masjidName }) {
  const name = actorName || 'A user';
  return logAdminAction({
    masjidId,
    userId,
    action: ACTIONS.MEMBER_REMOVED,
    message: `${name} removed ${targetName || 'a user'} from ${masjidName || 'a masjid'}`,
    metadata: { targetName, masjidName }
  });
}

function logMemberRoleUpdated({ masjidId, userId, actorName, targetName, masjidName, role }) {
  const name = actorName || 'A user';
  return logAdminAction({
    masjidId,
    userId,
    action: ACTIONS.MEMBER_ROLE_UPDATED,
    message: `${name} changed ${targetName || 'a user'} to ${role} at ${masjidName || 'a masjid'}`,
    metadata: { targetName, masjidName, role }
  });
}

function logMasjidCreated({ masjidId, userId, actorName, masjidName }) {
  const name = actorName || 'A user';
  return logAdminAction({
    masjidId,
    userId,
    action: ACTIONS.MASJID_CREATED,
    message: `${name} created masjid "${masjidName || 'a masjid'}"`,
    metadata: { masjidName }
  });
}

function logMasjidUpdated({ masjidId, userId, actorName, masjidName }) {
  const name = actorName || 'A user';
  return logAdminAction({
    masjidId,
    userId,
    action: ACTIONS.MASJID_UPDATED,
    message: `${name} updated masjid "${masjidName || 'a masjid'}"`,
    metadata: { masjidName }
  });
}

function logMasjidDeactivated({ masjidId, userId, actorName, masjidName }) {
  const name = actorName || 'A user';
  return logAdminAction({
    masjidId,
    userId,
    action: ACTIONS.MASJID_DEACTIVATED,
    message: `${name} deactivated masjid "${masjidName || 'a masjid'}"`,
    metadata: { masjidName }
  });
}

async function listLogsRaw({ masjidId, parsedPage, parsedLimit }) {
  const offset = (parsedPage - 1) * parsedLimit;
  const cutoff = retentionCutoff();
  const replacements = masjidId
    ? [cutoff, masjidId, parsedLimit, offset]
    : [cutoff, parsedLimit, offset];
  const masjidFilter = masjidId ? 'AND al.masjid_id = ?' : '';

  const [rows] = await sequelize.query(
    `SELECT al.*, u.name AS user_name, m.name AS masjid_name
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     LEFT JOIN masajids m ON m.id = al.masjid_id
     WHERE al.created_at >= ?
     ${masjidFilter}
     ORDER BY al.created_at DESC
     LIMIT ? OFFSET ?`,
    { replacements }
  );

  const countReplacements = masjidId ? [cutoff, masjidId] : [cutoff];
  const [countRows] = await sequelize.query(
    `SELECT COUNT(*) AS total
     FROM activity_logs
     WHERE created_at >= ?
     ${masjidId ? 'AND masjid_id = ?' : ''}`,
    { replacements: countReplacements }
  );

  return {
    logs: (rows || []).map(serializeLog),
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalItems: Number(countRows?.[0]?.total || 0)
    }
  };
}

async function listLogs({ masjidId, page = 1, limit = 50 }) {
  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

  try {
    await ensureActivityLogsTable(sequelize);
  } catch (error) {
    logger.error(`Could not ensure activity_logs table: ${error.message}`);
    return emptyResult(parsedPage, parsedLimit);
  }

  try {
    return await listLogsRaw({ masjidId, parsedPage, parsedLimit });
  } catch (error) {
    logger.error(`Raw activity log query failed, trying Sequelize: ${error.message}`);
  }

  const offset = (parsedPage - 1) * parsedLimit;
  const where = {
    created_at: { [Op.gte]: retentionCutoff() }
  };
  if (masjidId) {
    where.masjid_id = masjidId;
  }

  const query = {
    where,
    order: [['created_at', 'DESC']],
    limit: parsedLimit,
    offset
  };

  let rows;
  try {
    rows = await ActivityLog.findAll({
      ...query,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name'], required: false },
        { model: Masjid, as: 'masjid', attributes: ['id', 'name'], required: false }
      ]
    });
  } catch (error) {
    logger.error(`Activity log include query failed, retrying without include: ${error.message}`);
    try {
      rows = await ActivityLog.findAll(query);
    } catch (retryError) {
      logger.error(`Activity log query failed: ${retryError.message}`);
      return emptyResult(parsedPage, parsedLimit);
    }
  }

  let count = rows.length;
  try {
    count = await ActivityLog.count({ where });
  } catch (error) {
    logger.error(`Activity log count failed: ${error.message}`);
  }

  return {
    logs: rows.map(serializeLog),
    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      totalItems: count
    }
  };
}

module.exports = {
  ACTIONS,
  RETENTION_DAYS,
  logActivity,
  logPrayerTimeUpdate,
  logEventCreated,
  logQuestionAnswered,
  logAdminAction,
  logUserCreated,
  logUserUpdated,
  logUserDeleted,
  logUserStatusChanged,
  logMemberAdded,
  logMemberRemoved,
  logMemberRoleUpdated,
  logMasjidCreated,
  logMasjidUpdated,
  logMasjidDeactivated,
  listLogs,
  pruneOldLogs,
  getLogs: listLogs,
  deleteOldLogs: pruneOldLogs
};
