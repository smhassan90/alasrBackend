'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add device_id to questions table (for anonymous users)
    await queryInterface.addColumn('questions', 'device_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Unique device identifier for anonymous users (hashed deviceId:platform:appVersion)',
      after: 'user_id'
    });

    // Add index for device_id for faster lookups
    await queryInterface.addIndex('questions', ['device_id'], {
      name: 'questions_device_id_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index
    await queryInterface.removeIndex('questions', 'questions_device_id_index');

    // Remove column
    await queryInterface.removeColumn('questions', 'device_id');
  }
};

