'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('masjid_subscriptions', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Email for anonymous users or for email notifications'
      },
      category: {
        type: Sequelize.ENUM('Prayer Times', 'Donations', 'Events', 'General'),
        allowNull: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
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
    await queryInterface.addIndex('masjid_subscriptions', ['masjid_id'], {
      name: 'masjid_subscriptions_masjid_id'
    });

    await queryInterface.addIndex('masjid_subscriptions', ['user_id'], {
      name: 'masjid_subscriptions_user_id'
    });

    await queryInterface.addIndex('masjid_subscriptions', ['device_id'], {
      name: 'masjid_subscriptions_device_id'
    });

    await queryInterface.addIndex('masjid_subscriptions', ['email'], {
      name: 'masjid_subscriptions_email'
    });

    await queryInterface.addIndex('masjid_subscriptions', ['category'], {
      name: 'masjid_subscriptions_category'
    });

    // Note: Unique constraints will be enforced at application level
    // MySQL doesn't support partial unique indexes, so we'll handle uniqueness in the controller
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('masjid_subscriptions');
  }
};

