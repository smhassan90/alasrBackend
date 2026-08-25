const { Op } = require('sequelize');
const { Masjid, UserMasjid, PrayerTime, Event, Notification, sequelize } = require('../models');
const logger = require('./logger');

async function pickReplacementOwner(masjidId, userId, fallbackUserId, transaction) {
  const remainingMember = await UserMasjid.findOne({
    where: {
      masjid_id: masjidId,
      user_id: { [Op.ne]: userId }
    },
    order: [[sequelize.literal("FIELD(role, 'admin', 'imam')"), 'ASC']],
    transaction
  });

  const candidate = remainingMember?.user_id || fallbackUserId || null;
  if (!candidate || candidate === userId) {
    return null;
  }
  return candidate;
}

/**
 * Keep masajids (and their prayer times / events / notifications) when a user is deleted.
 * The user is only removed as a member; ownership is handed to another member or fallback user.
 */
async function detachUserFromMasajids({ userId, fallbackUserId, transaction }) {
  const ownedMasajids = await Masjid.findAll({
    where: { created_by: userId },
    transaction
  });

  for (const masjid of ownedMasajids) {
    const newOwnerId = await pickReplacementOwner(
      masjid.id,
      userId,
      fallbackUserId,
      transaction
    );
    masjid.created_by = newOwnerId;
    await masjid.save({ transaction });
    logger.info(
      `Reassigned masjid ${masjid.id} (${masjid.name}) created_by from ${userId} to ${newOwnerId || 'null'}`
    );
  }

  const replacementId =
    fallbackUserId && fallbackUserId !== userId ? fallbackUserId : null;

  if (replacementId) {
    await PrayerTime.update(
      { updated_by: replacementId },
      { where: { updated_by: userId }, transaction }
    );
    await Event.update(
      { created_by: replacementId },
      { where: { created_by: userId }, transaction }
    );
    await Notification.update(
      { created_by: replacementId },
      { where: { created_by: userId }, transaction }
    );
  }

  await UserMasjid.update(
    { assigned_by: null },
    { where: { assigned_by: userId }, transaction }
  );

  const removed = await UserMasjid.destroy({
    where: { user_id: userId },
    transaction
  });

  logger.info(`Removed user ${userId} from ${removed} masjid membership(s)`);
}

module.exports = { detachUserFromMasajids };
