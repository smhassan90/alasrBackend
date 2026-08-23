const { Op } = require('sequelize');
const { ActivityLog, User, Masjid, sequelize } = require('../models');
const logger = require('../utils/logger');
const { ensureActivityLogsTable } = require('../utils/ensureActivityLogsTable');

const RETENTION_DAYS = 7;

const ACTIONS = {
  PRAYER_TIME_UPDATED: 'prayer_time_updated',
  EVENT_CREATED: 'event_created',
  QUESTION_ANSWERED: 'question_answered'
};

function retentionCutoff() {
  return new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function formatClock(time) {
  if (!time) {
    return '';
  }
  return String(time).slice(0, 5);
}

async function pruneOldLogs() {
  try {
    await ensureActivityLogsTable(sequelize);
    const deleted = await ActivityLog.destroy({
      where: {
        createdAt: { [Op.lt]: retentionCutoff() }
      }
    });
    if (deleted > 0) {
      logger.info(`Pruned ${deleted} activity logs older than ${RETENTION_DAYS} days`);
    }
    return deleted;
  } catch (error) {
    logger.error(`Failed to prune activity logs: ${error.message}`);
    return 0;
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
    metadata: json.metadata || null,
    created_at: json.created_at || json.createdAt,
    user: json.user
      ? { id: json.user.id, name: json.user.name }
      : null,
    masjid: json.masjid
      ? { id: json.masjid.id, name: json.masjid.name }
      : null
  };
}

async function logActivity({ masjidId, userId, action, message, metadata }) {
  try {
    if (!masjidId || !action || !message) {
      return null;
    }
    await ensureActivityLogsTable(sequelize);
    const log = await ActivityLog.create({
      masjid_id: masjidId,
      user_id: userId || null,
      action,
      message: String(message).slice(0, 500),
      metadata: metadata || null
    });
    pruneOldLogs().catch(() => {});
    return log;
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

async function listLogs({ masjidId, page = 1, limit = 50 }) {
  await ensureActivityLogsTable(sequelize);
  await pruneOldLogs();

  const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
  const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const offset = (parsedPage - 1) * parsedLimit;
  const where = {
    createdAt: { [Op.gte]: retentionCutoff() }
  };
  if (masjidId) {
    where.masjid_id = masjidId;
  }

  const include = [
    { model: User, as: 'user', attributes: ['id', 'name'], required: false },
    { model: Masjid, as: 'masjid', attributes: ['id', 'name'], required: false }
  ];

  let rows;
  try {
    rows = await ActivityLog.findAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      limit: parsedLimit,
      offset
    });
  } catch (error) {
    logger.error(`Activity log include query failed, retrying without include: ${error.message}`);
    rows = await ActivityLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parsedLimit,
      offset
    });
  }

  const count = await ActivityLog.count({ where });

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
  listLogs,
  pruneOldLogs,
  pruneOldLogs: pruneOldLogs,
  getLogs: listLogs,
  deleteOldLogs: pruneOldLogs
};
