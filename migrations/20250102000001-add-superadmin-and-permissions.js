'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add is_super_admin to users table
    await queryInterface.addColumn('users', 'is_super_admin', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      after: 'is_active'
    });

    // Add permission columns to user_masajids table
    await queryInterface.addColumn('user_masajids', 'can_view_complaints', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      after: 'role'
    });

    await queryInterface.addColumn('user_masajids', 'can_answer_complaints', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      after: 'can_view_complaints'
    });

    await queryInterface.addColumn('user_masajids', 'can_view_questions', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      after: 'can_answer_complaints'
    });

    await queryInterface.addColumn('user_masajids', 'can_answer_questions', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      after: 'can_view_questions'
    });

    await queryInterface.addColumn('user_masajids', 'can_change_prayer_times', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      after: 'can_answer_questions'
    });

    await queryInterface.addColumn('user_masajids', 'can_create_events', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      after: 'can_change_prayer_times'
    });

    await queryInterface.addColumn('user_masajids', 'can_create_notifications', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      after: 'can_create_events'
    });

    // Update existing records to maintain backward compatibility
    // Set all permissions to true for existing admin role users
    await queryInterface.sequelize.query(`
      UPDATE user_masajids 
      SET 
        can_view_complaints = true,
        can_answer_complaints = true,
        can_view_questions = true,
        can_answer_questions = true,
        can_change_prayer_times = true,
        can_create_events = true,
        can_create_notifications = true
      WHERE role = 'admin'
    `);

    // Set specific permissions for existing imam role users
    await queryInterface.sequelize.query(`
      UPDATE user_masajids 
      SET 
        can_view_complaints = true,
        can_answer_complaints = false,
        can_view_questions = true,
        can_answer_questions = true,
        can_change_prayer_times = true,
        can_create_events = true,
        can_create_notifications = true
      WHERE role = 'imam'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove permission columns from user_masajids
    await queryInterface.removeColumn('user_masajids', 'can_create_notifications');
    await queryInterface.removeColumn('user_masajids', 'can_create_events');
    await queryInterface.removeColumn('user_masajids', 'can_change_prayer_times');
    await queryInterface.removeColumn('user_masajids', 'can_answer_questions');
    await queryInterface.removeColumn('user_masajids', 'can_view_questions');
    await queryInterface.removeColumn('user_masajids', 'can_answer_complaints');
    await queryInterface.removeColumn('user_masajids', 'can_view_complaints');

    // Remove is_super_admin from users
    await queryInterface.removeColumn('users', 'is_super_admin');
  }
};

