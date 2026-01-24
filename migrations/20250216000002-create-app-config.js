'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('app_config', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true
      },
      value: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      }
    });

    // Add index on key for faster lookups
    await queryInterface.addIndex('app_config', ['key'], {
      name: 'idx_app_config_key',
      unique: true
    });

    // Insert default config
    const { v4: uuidv4 } = require('uuid');
    await queryInterface.bulkInsert('app_config', [
      {
        id: uuidv4(),
        key: 'max_favorites_limit',
        value: '5',
        description: 'Maximum number of masjids a user can add to favorites',
        updated_at: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('app_config');
  }
};

