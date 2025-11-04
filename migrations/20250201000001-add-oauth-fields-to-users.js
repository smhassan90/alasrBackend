'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add OAuth fields to users table
    await queryInterface.addColumn('users', 'auth_provider', {
      type: Sequelize.ENUM('local', 'google', 'facebook'),
      allowNull: true,
      defaultValue: 'local',
      after: 'email'
    });

    await queryInterface.addColumn('users', 'google_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
      after: 'auth_provider'
    });

    await queryInterface.addColumn('users', 'facebook_id', {
      type: Sequelize.STRING(255),
      allowNull: true,
      unique: true,
      after: 'google_id'
    });

    // Make password optional for OAuth users
    await queryInterface.changeColumn('users', 'password', {
      type: Sequelize.STRING(255),
      allowNull: true
    });

    // Add unique index for google_id (only non-null values)
    // Note: MySQL doesn't support partial indexes, so we'll create a regular unique index
    // If there are duplicate nulls, we may need to handle this differently
    try {
      await queryInterface.addIndex('users', ['google_id'], {
        unique: true,
        name: 'users_google_id_unique'
      });
    } catch (error) {
      // Index might already exist
      console.log('Note: Could not create unique index for google_id (may already exist)');
    }

    // Add unique index for facebook_id
    try {
      await queryInterface.addIndex('users', ['facebook_id'], {
        unique: true,
        name: 'users_facebook_id_unique'
      });
    } catch (error) {
      // Index might already exist
      console.log('Note: Could not create unique index for facebook_id (may already exist)');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('users', 'users_facebook_id_unique');
    await queryInterface.removeIndex('users', 'users_google_id_unique');

    // Remove columns
    await queryInterface.removeColumn('users', 'facebook_id');
    await queryInterface.removeColumn('users', 'google_id');
    await queryInterface.removeColumn('users', 'auth_provider');

    // Revert password to required
    await queryInterface.changeColumn('users', 'password', {
      type: Sequelize.STRING(255),
      allowNull: false
    });
  }
};

