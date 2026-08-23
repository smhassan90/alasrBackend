const { DataTypes } = require('sequelize');
const logger = require('./logger');

let ready = false;
let inFlight = null;

async function ensureAreaColumn(sequelize) {
  if (ready) {
    return;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('masajids');
    if (!table.area) {
      await queryInterface.addColumn('masajids', 'area', {
        type: DataTypes.STRING(100),
        allowNull: true
      });
      logger.info('Added missing masajids.area column');
    }
    ready = true;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

module.exports = { ensureAreaColumn };
