const { DataTypes } = require('sequelize');
const logger = require('./logger');
const { flattenDefaultAreas } = require('../data/locations');

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

async function ensureAreasTable(sequelize) {
  if (ready) {
    return;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    const queryInterface = sequelize.getQueryInterface();
    const tables = tableNames(await queryInterface.showAllTables());
    if (!tables.includes('areas')) {
      await queryInterface.createTable('areas', {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        name: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        city: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        state: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        country: {
          type: DataTypes.STRING(100),
          allowNull: false
        },
        created_by: {
          type: DataTypes.UUID,
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
      await queryInterface.addIndex('areas', ['country', 'state', 'city', 'name'], {
        unique: true,
        name: 'uniq_areas_location_name'
      });
      await queryInterface.addIndex('areas', ['country', 'state', 'city'], {
        name: 'idx_areas_location'
      });
      logger.info('Created missing areas table');
    }

    const [countRow] = await sequelize.query(
      'SELECT COUNT(*) AS total FROM areas',
      { type: sequelize.QueryTypes.SELECT }
    );
    if (Number(countRow?.total || 0) === 0) {
      const now = new Date();
      const seedRows = flattenDefaultAreas().map((area) => ({
        id: require('crypto').randomUUID(),
        name: area.name,
        city: area.city,
        state: area.state,
        country: area.country,
        created_by: null,
        created_at: now,
        updated_at: now
      }));
      if (seedRows.length > 0) {
        await queryInterface.bulkInsert('areas', seedRows);
        logger.info(`Seeded ${seedRows.length} default areas`);
      }
    }

    ready = true;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}

module.exports = { ensureAreasTable };
