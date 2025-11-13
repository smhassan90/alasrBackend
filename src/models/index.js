// Explicitly require mysql2 before Sequelize to ensure it's available
// This is critical for serverless environments like Vercel
require('mysql2');

const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Validate config before initializing
if (!dbConfig) {
  throw new Error(`Database config not found for environment: ${env}`);
}

// Initialize Sequelize (doesn't connect immediately - lazy connection)
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: dbConfig.define,
    dialectOptions: dbConfig.dialectOptions,
    retry: dbConfig.retry || { max: 3 }
  }
);

// Import models
const User = require('./User')(sequelize);
const Masjid = require('./Masjid')(sequelize);
const UserMasjid = require('./UserMasjid')(sequelize);
const PrayerTime = require('./PrayerTime')(sequelize);
const Question = require('./Question')(sequelize);
const Notification = require('./Notification')(sequelize);
const Event = require('./Event')(sequelize);
const UserSettings = require('./UserSettings')(sequelize);
const MasjidSubscription = require('./MasjidSubscription')(sequelize);

// Create models object
const models = {
  User,
  Masjid,
  UserMasjid,
  PrayerTime,
  Question,
  Notification,
  Event,
  UserSettings,
  MasjidSubscription,
  sequelize,
  Sequelize
};

// Setup associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = models;

