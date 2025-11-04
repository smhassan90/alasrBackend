'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add user_id to questions table (optional, for authenticated users)
    await queryInterface.addColumn('questions', 'user_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      after: 'masjid_id'
    });

    // Add index for user_id
    await queryInterface.addIndex('questions', ['user_id'], {
      name: 'questions_user_id_index'
    });

    // Add index for user_email for faster lookups
    await queryInterface.addIndex('questions', ['user_email'], {
      name: 'questions_user_email_index'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('questions', 'questions_user_email_index');
    await queryInterface.removeIndex('questions', 'questions_user_id_index');

    // Remove column
    await queryInterface.removeColumn('questions', 'user_id');
  }
};

