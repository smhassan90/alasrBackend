'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_settings', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      prayer_times_notifications: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      events_notifications: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      donations_notifications: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      general_notifications: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      questions_notifications: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add unique index on user_id
    await queryInterface.addIndex('user_settings', ['user_id'], {
      unique: true,
      name: 'user_settings_user_id_unique'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_settings');
  }
};

