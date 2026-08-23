'use strict';
const { randomUUID } = require('crypto');
const { flattenDefaultAreas } = require('../src/data/locations');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    const names = tables.map((table) =>
      String(typeof table === 'string' ? table : table.tableName || table.name || '').toLowerCase()
    );

    if (!names.includes('areas')) {
      await queryInterface.createTable('areas', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        city: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        state: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        country: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        created_by: {
          type: Sequelize.UUID,
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

      await queryInterface.addIndex('areas', ['country', 'state', 'city', 'name'], {
        unique: true,
        name: 'uniq_areas_location_name'
      });
      await queryInterface.addIndex('areas', ['country', 'state', 'city'], {
        name: 'idx_areas_location'
      });
    }

    const [countRow] = await queryInterface.sequelize.query(
      'SELECT COUNT(*) AS total FROM areas',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (Number(countRow?.total || 0) === 0) {
      const now = new Date();
      const seedRows = flattenDefaultAreas().map((area) => ({
        id: randomUUID(),
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
      }
    }
  },

  down: async (queryInterface) => {
    const tables = await queryInterface.showAllTables();
    const names = tables.map((table) =>
      String(typeof table === 'string' ? table : table.tableName || table.name || '').toLowerCase()
    );
    if (names.includes('areas')) {
      await queryInterface.dropTable('areas');
    }
  }
};
