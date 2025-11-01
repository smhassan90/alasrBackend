'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // For MySQL: Alter the ENUM to include 'Jummah'
    // Note: MySQL requires recreating the ENUM with all values
    const dialect = queryInterface.sequelize.getDialect();
    
    if (dialect === 'mysql') {
      await queryInterface.sequelize.query(`
        ALTER TABLE prayer_times 
        MODIFY COLUMN prayer_name ENUM('Fajr', 'Dhuhr', 'Jummah', 'Asr', 'Maghrib', 'Isha') NOT NULL
      `);
    } else {
      // For PostgreSQL and other databases
      await queryInterface.sequelize.query(`
        ALTER TYPE "enum_prayer_times_prayer_name" ADD VALUE IF NOT EXISTS 'Jummah'
      `).catch(() => {
        // If it fails, try to alter the column directly
        return queryInterface.changeColumn('prayer_times', 'prayer_name', {
          type: Sequelize.ENUM('Fajr', 'Dhuhr', 'Jummah', 'Asr', 'Maghrib', 'Isha'),
          allowNull: false
        });
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Revert back to original ENUM (remove Jummah)
    const dialect = queryInterface.sequelize.getDialect();
    
    if (dialect === 'mysql') {
      // Note: This will fail if there are existing Jummah prayer times in the database
      // You may need to delete them first or handle this differently
      await queryInterface.sequelize.query(`
        ALTER TABLE prayer_times 
        MODIFY COLUMN prayer_name ENUM('Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha') NOT NULL
      `);
    } else {
      // For PostgreSQL, we can't remove enum values, so we change the column
      await queryInterface.changeColumn('prayer_times', 'prayer_name', {
        type: Sequelize.ENUM('Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'),
        allowNull: false
      });
    }
  }
};

