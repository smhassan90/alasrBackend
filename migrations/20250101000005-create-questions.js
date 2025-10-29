'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('questions', {
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
      user_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      user_email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      question: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('new', 'replied'),
        defaultValue: 'new',
        allowNull: false
      },
      reply: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      replied_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      replied_at: {
        type: Sequelize.DATE,
        allowNull: true
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
    await queryInterface.addIndex('questions', ['masjid_id'], {
      name: 'questions_masjid_id'
    });

    await queryInterface.addIndex('questions', ['status'], {
      name: 'questions_status'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('questions');
  }
};

