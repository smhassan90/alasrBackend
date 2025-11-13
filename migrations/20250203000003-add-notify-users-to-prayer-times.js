'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if notify_users column already exists
    const tableDescription = await queryInterface.describeTable('prayer_times');
    
    // Add notify_users column only if it doesn't exist
    if (!tableDescription.notify_users) {
      await queryInterface.addColumn('prayer_times', 'notify_users', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether to notify users when prayer time is updated'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('prayer_times', 'notify_users');
  }
};

