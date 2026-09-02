const { DataTypes } = require('sequelize');
const logger = require('./logger');

let ready = false;
let inFlight = null;

async function ensureEventLastNotifiedColumn(sequelize) {
  if (ready) {
    return;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('events');
    if (!table.last_notified_on) {
      await queryInterface.addColumn('events', 'last_notified_on', {
        type: DataTypes.DATEONLY,
        allowNull: true,
      });
      logger.info('Added missing events.last_notified_on column');
    }
    ready = true;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

module.exports = { ensureEventLastNotifiedColumn };
