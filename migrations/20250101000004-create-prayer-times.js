'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('prayer_times', {
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
      prayer_name: {
        type: Sequelize.ENUM('Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'),
        allowNull: false
      },
      prayer_time: {
        type: Sequelize.TIME,
        allowNull: false
      },
      effective_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
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

    // Add index on masjid_id
    await queryInterface.addIndex('prayer_times', ['masjid_id'], {
      name: 'prayer_times_masjid_id'
    });

    // Add unique constraint
    await queryInterface.addConstraint('prayer_times', {
      fields: ['masjid_id', 'prayer_name', 'effective_date'],
      type: 'unique',
      name: 'unique_masjid_prayer_date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('prayer_times');
  }
};

