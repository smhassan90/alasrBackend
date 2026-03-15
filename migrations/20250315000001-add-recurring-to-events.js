'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Add event_type column
    await queryInterface.addColumn('events', 'event_type', {
      type: Sequelize.ENUM('one_time', 'recurring'),
      defaultValue: 'one_time',
      allowNull: false,
      after: 'description'
    });

    // Add day_of_week column
    await queryInterface.addColumn('events', 'day_of_week', {
      type: Sequelize.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 6
      },
      after: 'event_type' // Sunday is 0, Monday is 1...
    });

    // Make event_date nullable
    await queryInterface.changeColumn('events', 'event_date', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    // Revert event_date to not null
    // Note: If there are rows with null event_date, this will fail.
    // In a real production rollback we'd probably have to set a dummy date first.
    await queryInterface.changeColumn('events', 'event_date', {
      type: Sequelize.DATEONLY,
      allowNull: false
    });

    await queryInterface.removeColumn('events', 'day_of_week');
    await queryInterface.removeColumn('events', 'event_type');
  }
};
