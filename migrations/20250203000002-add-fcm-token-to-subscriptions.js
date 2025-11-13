'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if fcm_token column already exists
    const tableDescription = await queryInterface.describeTable('masjid_subscriptions');
    
    // Add fcm_token column only if it doesn't exist
    if (!tableDescription.fcm_token) {
      await queryInterface.addColumn('masjid_subscriptions', 'fcm_token', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Firebase Cloud Messaging token for push notifications'
      });
    }

    // Remove email column if it exists (optional - only if you want to remove it)
    // await queryInterface.removeColumn('masjid_subscriptions', 'email');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove fcm_token column
    await queryInterface.removeColumn('masjid_subscriptions', 'fcm_token');
  }
};

