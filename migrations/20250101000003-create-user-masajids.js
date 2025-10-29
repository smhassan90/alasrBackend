'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_masajids', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
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
      role: {
        type: Sequelize.ENUM('imam', 'admin'),
        allowNull: false
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      assigned_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      assigned_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
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
    await queryInterface.addIndex('user_masajids', ['user_id'], {
      name: 'user_masajids_user_id'
    });

    await queryInterface.addIndex('user_masajids', ['masjid_id'], {
      name: 'user_masajids_masjid_id'
    });

    await queryInterface.addIndex('user_masajids', ['masjid_id', 'role'], {
      name: 'user_masajids_masjid_role'
    });

    // Add unique constraint
    await queryInterface.addConstraint('user_masajids', {
      fields: ['user_id', 'masjid_id', 'role'],
      type: 'unique',
      name: 'unique_user_masjid_role'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_masajids');
  }
};

