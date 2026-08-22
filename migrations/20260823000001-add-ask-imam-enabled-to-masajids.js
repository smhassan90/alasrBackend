'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('masajids');

    if (!tableDescription.ask_imam_enabled) {
      await queryInterface.addColumn('masajids', 'ask_imam_enabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether users can submit Ask Imam questions for this masjid',
      });
    }
  },

  down: async (queryInterface) => {
    const tableDescription = await queryInterface.describeTable('masajids');
    if (tableDescription.ask_imam_enabled) {
      await queryInterface.removeColumn('masajids', 'ask_imam_enabled');
    }
  },
};
