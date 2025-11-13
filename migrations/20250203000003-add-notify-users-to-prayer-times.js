'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('prayer_times', 'notify_users', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether to notify users when prayer time is updated'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('prayer_times', 'notify_users');
  }
};

