require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'salaahmanager',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 20,           // Increased from 5 to handle more concurrent requests
      min: 2,            // Keep minimum connections ready
      acquire: 60000,    // Increased timeout to 60 seconds
      idle: 10000,       // Close idle connections after 10 seconds
      evict: 1000,       // Check for idle connections every second
      handleDisconnects: true  // Automatically handle disconnects
    },
    dialectOptions: {
      connectTimeout: 60000,  // 60 second connection timeout
      // Handle connection resets
      supportBigNumbers: true,
      bigNumberStrings: true
    },
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME + '_test' || 'salaahmanager_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 30,           // Higher for production
      min: 5,            // Keep more connections ready
      acquire: 60000,    // 60 second timeout
      idle: 10000,
      evict: 1000,
      handleDisconnects: true
    },
    dialectOptions: {
      connectTimeout: 60000,
      supportBigNumbers: true,
      bigNumberStrings: true
    },
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  }
};

