const { DataTypes } = require('sequelize');
const logger = require('./logger');

let ready = false;
let inFlight = null;

function tableNames(tables) {
  return tables.map((table) => {
    if (typeof table === 'string') {
      return table.toLowerCase();
    }
    return String(table.tableName || table.name || Object.values(table)[0] || '').toLowerCase();
  });
}

async function ensureActivityLogsTable(sequelize) {
  if (ready) {
    return;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const queryInterface = sequelize.getQueryInterface();
    const tables = tableNames(await queryInterface.showAllTables());
    if (!tables.includes('activity_logs')) {
      await queryInterface.createTable('activity_logs', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        masjid_id: {
          type: DataTypes.UUID,
          allowNull: false
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: true
        },
        action: {
          type: DataTypes.STRING(50),
          allowNull: false
        },
        message: {
          type: DataTypes.STRING(500),
          allowNull: false
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: true
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
      await queryInterface.addIndex('activity_logs', ['masjid_id', 'created_at'], {
        name: 'idx_activity_logs_masjid_created'
      });
      await queryInterface.addIndex('activity_logs', ['created_at'], {
        name: 'idx_activity_logs_created'
      });
      logger.info('Created missing activity_logs table');
    }
    ready = true;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

module.exports = { ensureActivityLogsTable };
