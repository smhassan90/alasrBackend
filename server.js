require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/models');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5000;

// Test database connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Database connection established successfully');
    
    // Sync models in development (be careful in production!)
    if (process.env.NODE_ENV === 'development') {
      // Use alter: true to update schema without dropping tables
      // await sequelize.sync({ alter: true });
      // logger.info('✅ Database models synchronized');
    }
  } catch (error) {
    logger.error('❌ Unable to connect to database:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();

  const server = app.listen(PORT, () => {
    logger.info(`🚀 Server running on port ${PORT}`);
    logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔗 API Base URL: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    logger.info(`\n${signal} received. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async () => {
      logger.info('✅ HTTP server closed');
      
      // Close database connection
      try {
        await sequelize.close();
        logger.info('✅ Database connection closed');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('⚠️ Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
};

// Start the server
startServer();

