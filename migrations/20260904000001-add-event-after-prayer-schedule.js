'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('events');

    if (!table.time_mode) {
      await queryInterface.addColumn('events', 'time_mode', {
        type: Sequelize.ENUM('fixed', 'after_prayer'),
        allowNull: false,
        defaultValue: 'fixed',
        after: 'event_time',
      });
    }

    if (!table.after_prayer) {
      await queryInterface.addColumn('events', 'after_prayer', {
        type: Sequelize.STRING(20),
        allowNull: true,
        after: 'time_mode',
      });
    }

    if (!table.minutes_after) {
      await queryInterface.addColumn('events', 'minutes_after', {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 15,
        after: 'after_prayer',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('events');
    if (table.minutes_after) {
      await queryInterface.removeColumn('events', 'minutes_after');
    }
    if (table.after_prayer) {
      await queryInterface.removeColumn('events', 'after_prayer');
    }
    if (table.time_mode) {
      await queryInterface.removeColumn('events', 'time_mode');
    }
  },
};
