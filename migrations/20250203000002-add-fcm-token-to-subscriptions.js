'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add fcm_token column
    await queryInterface.addColumn('masjid_subscriptions', 'fcm_token', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Firebase Cloud Messaging token for push notifications'
    });

    // Add index for fcm_token
    await queryInterface.addIndex('masjid_subscriptions', ['fcm_token'], {
      name: 'masjid_subscriptions_fcm_token'
    });

    // Remove email column if it exists (optional - only if you want to remove it)
    // await queryInterface.removeColumn('masjid_subscriptions', 'email');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index
    await queryInterface.removeIndex('masjid_subscriptions', 'masjid_subscriptions_fcm_token');
    
    // Remove fcm_token column
    await queryInterface.removeColumn('masjid_subscriptions', 'fcm_token');
  }
};

