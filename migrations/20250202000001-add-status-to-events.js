'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('events', 'status', {
      type: Sequelize.ENUM('active', 'deleted'),
      defaultValue: 'active',
      allowNull: false,
      after: 'created_by'
    });

    // Add index on status for better query performance
    await queryInterface.addIndex('events', ['status'], {
      name: 'events_status'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('events', 'events_status');
    await queryInterface.removeColumn('events', 'status');
  }
};

