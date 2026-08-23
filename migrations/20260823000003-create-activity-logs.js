'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const names = tables.map((table) => {
      if (typeof table === 'string') {
        return table.toLowerCase();
      }
      return String(table.tableName || table.name || Object.values(table)[0] || '').toLowerCase();
    });

    if (names.includes('activity_logs')) {
      return;
    }

    await queryInterface.createTable('activity_logs', {
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
        onDelete: 'SET NULL'
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      message: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      metadata: {
        type: Sequelize.TEXT,
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
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('activity_logs', ['masjid_id', 'created_at'], {
      name: 'idx_activity_logs_masjid_created'
    });
    await queryInterface.addIndex('activity_logs', ['created_at'], {
      name: 'idx_activity_logs_created'
    });
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    const names = tables.map((table) => {
      if (typeof table === 'string') {
        return table.toLowerCase();
      }
      return String(table.tableName || table.name || Object.values(table)[0] || '').toLowerCase();
    });
    if (names.includes('activity_logs')) {
      await queryInterface.dropTable('activity_logs');
    }
  }
};
