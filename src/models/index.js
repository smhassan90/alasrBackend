const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize
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
    define: dbConfig.define
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

