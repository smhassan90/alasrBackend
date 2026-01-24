'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_favorites', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      device_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'For anonymous users without account'
      },
      masjid_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'masajids',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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

    // Add indexes
    await queryInterface.addIndex('user_favorites', ['user_id'], {
      name: 'idx_user_favorites_user_id'
    });

    await queryInterface.addIndex('user_favorites', ['device_id'], {
      name: 'idx_user_favorites_device_id'
    });

    await queryInterface.addIndex('user_favorites', ['masjid_id'], {
      name: 'idx_user_favorites_masjid_id'
    });

    // Note: Unique constraints will be enforced at application level
    // MySQL doesn't support partial unique indexes, so we'll handle uniqueness in the controller
    // We need to ensure: (user_id, masjid_id) is unique when user_id IS NOT NULL
    // and (device_id, masjid_id) is unique when device_id IS NOT NULL
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_favorites');
  }
};

