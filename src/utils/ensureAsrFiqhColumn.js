const { DataTypes } = require('sequelize');
const logger = require('./logger');

let ready = false;
let inFlight = null;

async function ensureAsrFiqhColumn(sequelize) {
  if (ready) {
    return;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('masajids');
    if (!table.asr_fiqh) {
      await queryInterface.addColumn('masajids', 'asr_fiqh', {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'hanafi',
      });
      logger.info('Added missing masajids.asr_fiqh column');
    }
    ready = true;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

module.exports = { ensureAsrFiqhColumn };
