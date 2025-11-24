'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Make category nullable in masjid_subscriptions table
    await queryInterface.changeColumn('masjid_subscriptions', 'category', {
      type: Sequelize.ENUM('Prayer Times', 'Donations', 'Events', 'General'),
      allowNull: true,
      comment: 'Deprecated: Category preferences are now stored in user_settings. This field is kept for backward compatibility.'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert: make category NOT NULL again
    // First, we need to set a default value for NULL categories
    await queryInterface.sequelize.query(`
      UPDATE masjid_subscriptions 
      SET category = 'General' 
      WHERE category IS NULL
    `);
    
    await queryInterface.changeColumn('masjid_subscriptions', 'category', {
      type: Sequelize.ENUM('Prayer Times', 'Donations', 'Events', 'General'),
      allowNull: false
    });
  }
};

