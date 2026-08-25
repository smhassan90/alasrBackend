'use strict';

module.exports = {
  up: async (queryInterface) => {
    const [tables] = await queryInterface.sequelize.query("SHOW TABLES LIKE 'activity_logs'");
    if (!tables || tables.length === 0) {
      return;
    }

    await queryInterface.sequelize.query(
      'ALTER TABLE activity_logs MODIFY masjid_id CHAR(36) NULL'
    );
  },

  down: async (queryInterface) => {
    const [tables] = await queryInterface.sequelize.query("SHOW TABLES LIKE 'activity_logs'");
    if (!tables || tables.length === 0) {
      return;
    }

    await queryInterface.sequelize.query(
      "UPDATE activity_logs SET masjid_id = '00000000-0000-0000-0000-000000000000' WHERE masjid_id IS NULL"
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE activity_logs MODIFY masjid_id CHAR(36) NOT NULL'
    );
  }
};
