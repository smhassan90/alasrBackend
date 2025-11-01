const { PrayerTime, Masjid, User, sequelize } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Get all prayer times for a masjid
 * @route GET /api/prayer-times/masjid/:masjidId
 */
exports.getPrayerTimesByMasjid = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const { effectiveDate } = req.query;

    const whereClause = { masjid_id: masjidId };
    
    if (effectiveDate) {
      whereClause.effective_date = effectiveDate;
    }

    const prayerTimes = await PrayerTime.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [
        ['effective_date', 'DESC'],
        [sequelize.literal("FIELD(prayer_name, 'Fajr', 'Dhuhr', 'Jummah', 'Asr', 'Maghrib', 'Isha')")]
      ]
    });

    return responseHelper.success(res, prayerTimes, 'Prayer times retrieved successfully');
  } catch (error) {
    logger.error(`Get prayer times error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve prayer times', 500);
  }
};

/**
 * Get today's prayer times for a masjid
 * @route GET /api/prayer-times/masjid/:masjidId/today
 */
exports.getTodaysPrayerTimes = async (req, res) => {
  try {
    const { masjidId } = req.params;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const prayerTimes = await PrayerTime.findAll({
      where: {
        masjid_id: masjidId,
        effective_date: {
          [Op.lte]: today
        }
      },
      order: [
        ['effective_date', 'DESC'],
        [sequelize.literal("FIELD(prayer_name, 'Fajr', 'Dhuhr', 'Jummah', 'Asr', 'Maghrib', 'Isha')")]
      ]
    });

    // Get the most recent prayer time for each prayer
    const latestPrayerTimes = {};
    prayerTimes.forEach(pt => {
      if (!latestPrayerTimes[pt.prayer_name]) {
        latestPrayerTimes[pt.prayer_name] = pt;
      }
    });

    const result = Object.values(latestPrayerTimes);

    return responseHelper.success(res, result, 'Today\'s prayer times retrieved successfully');
  } catch (error) {
    logger.error(`Get today's prayer times error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve prayer times', 500);
  }
};

/**
 * Create or update prayer time
 * @route POST /api/prayer-times
 */
exports.createPrayerTime = async (req, res) => {
  try {
    const { masjidId, prayerName, prayerTime, effectiveDate } = req.body;

    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    const date = effectiveDate || new Date().toISOString().split('T')[0];

    // Check if prayer time already exists
    const existingPrayerTime = await PrayerTime.findOne({
      where: {
        masjid_id: masjidId,
        prayer_name: prayerName,
        effective_date: date
      }
    });

    let prayerTimeRecord;

    if (existingPrayerTime) {
      // Update existing
      existingPrayerTime.prayer_time = prayerTime;
      existingPrayerTime.updated_by = req.userId;
      await existingPrayerTime.save();
      prayerTimeRecord = existingPrayerTime;
      
      logger.info(`Prayer time updated: ${prayerName} for masjid ${masjidId} by ${req.userId}`);
    } else {
      // Create new
      prayerTimeRecord = await PrayerTime.create({
        masjid_id: masjidId,
        prayer_name: prayerName,
        prayer_time: prayerTime,
        effective_date: date,
        updated_by: req.userId
      });
      
      logger.info(`Prayer time created: ${prayerName} for masjid ${masjidId} by ${req.userId}`);
    }

    return responseHelper.success(res, prayerTimeRecord, 'Prayer time saved successfully', existingPrayerTime ? 200 : 201);
  } catch (error) {
    logger.error(`Create prayer time error: ${error.message}`);
    return responseHelper.error(res, 'Failed to save prayer time', 500);
  }
};

/**
 * Update specific prayer time
 * @route PUT /api/prayer-times/:id
 */
exports.updatePrayerTime = async (req, res) => {
  try {
    const { id } = req.params;
    const { prayerTime, effectiveDate } = req.body;

    const prayerTimeRecord = await PrayerTime.findByPk(id);
    if (!prayerTimeRecord) {
      return responseHelper.notFound(res, 'Prayer time not found');
    }

    if (prayerTime) prayerTimeRecord.prayer_time = prayerTime;
    if (effectiveDate) prayerTimeRecord.effective_date = effectiveDate;
    prayerTimeRecord.updated_by = req.userId;

    await prayerTimeRecord.save();

    logger.info(`Prayer time ${id} updated by ${req.userId}`);

    return responseHelper.success(res, prayerTimeRecord, 'Prayer time updated successfully');
  } catch (error) {
    logger.error(`Update prayer time error: ${error.message}`);
    return responseHelper.error(res, 'Failed to update prayer time', 500);
  }
};

/**
 * Delete prayer time
 * @route DELETE /api/prayer-times/:id
 */
exports.deletePrayerTime = async (req, res) => {
  try {
    const { id } = req.params;

    const prayerTime = await PrayerTime.findByPk(id);
    if (!prayerTime) {
      return responseHelper.notFound(res, 'Prayer time not found');
    }

    await prayerTime.destroy();

    logger.info(`Prayer time ${id} deleted by ${req.userId}`);

    return responseHelper.success(res, null, 'Prayer time deleted successfully');
  } catch (error) {
    logger.error(`Delete prayer time error: ${error.message}`);
    return responseHelper.error(res, 'Failed to delete prayer time', 500);
  }
};

/**
 * Bulk update all prayer times for a masjid
 * @route POST /api/prayer-times/bulk
 */
exports.bulkUpdatePrayerTimes = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { masjidId, prayerTimes, effectiveDate } = req.body;

    const masjid = await Masjid.findByPk(masjidId);
    if (!masjid) {
      return responseHelper.notFound(res, 'Masjid not found');
    }

    const date = effectiveDate || new Date().toISOString().split('T')[0];

    const createdPrayerTimes = [];

    for (const pt of prayerTimes) {
      // Check if exists
      const existing = await PrayerTime.findOne({
        where: {
          masjid_id: masjidId,
          prayer_name: pt.prayerName,
          effective_date: date
        },
        transaction
      });

      if (existing) {
        // Update
        existing.prayer_time = pt.prayerTime;
        existing.updated_by = req.userId;
        await existing.save({ transaction });
        createdPrayerTimes.push(existing);
      } else {
        // Create
        const newPrayerTime = await PrayerTime.create({
          masjid_id: masjidId,
          prayer_name: pt.prayerName,
          prayer_time: pt.prayerTime,
          effective_date: date,
          updated_by: req.userId
        }, { transaction });
        createdPrayerTimes.push(newPrayerTime);
      }
    }

    await transaction.commit();

    logger.info(`Bulk prayer times updated for masjid ${masjidId} by ${req.userId}`);

    return responseHelper.success(res, createdPrayerTimes, 'Prayer times updated successfully');
  } catch (error) {
    await transaction.rollback();
    logger.error(`Bulk update prayer times error: ${error.message}`);
    return responseHelper.error(res, 'Failed to update prayer times', 500);
  }
};

