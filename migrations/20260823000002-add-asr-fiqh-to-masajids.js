'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('masajids');

    if (!tableDescription.asr_fiqh) {
      await queryInterface.addColumn('masajids', 'asr_fiqh', {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'hanafi',
        comment: 'Fiqh used for Zuhr/Jummah end time: Hanafi (Abu Hanifa) or Shafai',
      });
    }
  },

  down: async (queryInterface) => {
    const tableDescription = await queryInterface.describeTable('masajids');
    if (tableDescription.asr_fiqh) {
      await queryInterface.removeColumn('masajids', 'asr_fiqh');
    }
  },
};
