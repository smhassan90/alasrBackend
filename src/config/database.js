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
    username: process.env.DB_USER || process.env.DATABASE_USER || 'root',
    password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || '',
    database: process.env.DB_NAME || process.env.DATABASE_NAME || 'salaahmanager',
    host: process.env.DB_HOST || process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.DATABASE_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false,
    // Don't connect on initialization - lazy connect for serverless
    // Set pool to avoid immediate connection
    pool: {
      max: 10,           // Reduced for serverless (Vercel)
      min: 0,            // Don't keep connections (serverless)
      acquire: 30000,    // 30 second timeout
      idle: 10000,       // Close idle connections quickly
      evict: 1000,
      handleDisconnects: true
    },
    dialectOptions: {
      connectTimeout: 30000,  // 30 second connection timeout
      supportBigNumbers: true,
      bigNumberStrings: true,
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
      } : false
    },
    define: {
      timestamps: true,
      underscored: true,
      underscoredAll: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    // Don't connect automatically - connect on first query
    // This prevents connection attempts on module load (serverless)
    retry: {
      max: 3
    }
  }
};

