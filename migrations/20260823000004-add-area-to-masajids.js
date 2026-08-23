'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDescription = await queryInterface.describeTable('masajids');

    if (!tableDescription.area) {
      await queryInterface.addColumn('masajids', 'area', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Neighborhood / block / area name'
      });
    }
  },

  down: async (queryInterface) => {
    const tableDescription = await queryInterface.describeTable('masajids');
    if (tableDescription.area) {
      await queryInterface.removeColumn('masajids', 'area');
    }
  }
};
