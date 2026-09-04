const { DataTypes } = require('sequelize');
const logger = require('./logger');

let ready = false;
let inFlight = null;

async function ensureEventScheduleColumns(sequelize) {
  if (ready) {
    return;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('events');

    if (!table.time_mode) {
      await queryInterface.addColumn('events', 'time_mode', {
        type: DataTypes.ENUM('fixed', 'after_prayer'),
        allowNull: false,
        defaultValue: 'fixed',
      });
      logger.info('Added missing events.time_mode column');
    }

    if (!table.after_prayer) {
      await queryInterface.addColumn('events', 'after_prayer', {
        type: DataTypes.STRING(20),
        allowNull: true,
      });
      logger.info('Added missing events.after_prayer column');
    }

    if (!table.minutes_after) {
      await queryInterface.addColumn('events', 'minutes_after', {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 15,
      });
      logger.info('Added missing events.minutes_after column');
    }

    ready = true;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

module.exports = { ensureEventScheduleColumns };
