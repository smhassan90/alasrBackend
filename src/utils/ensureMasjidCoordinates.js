const { DataTypes } = require('sequelize');
const logger = require('./logger');

let ready = false;
let inFlight = null;

async function ensureMasjidCoordinates(sequelize) {
  if (ready) {
    return;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('masajids');
    if (!table.latitude) {
      await queryInterface.addColumn('masajids', 'latitude', {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      });
      logger.info('Added missing masajids.latitude column');
    }
    if (!table.longitude) {
      await queryInterface.addColumn('masajids', 'longitude', {
        type: DataTypes.DECIMAL(10, 7),
        allowNull: true,
      });
      logger.info('Added missing masajids.longitude column');
    }
    ready = true;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

module.exports = { ensureMasjidCoordinates };
