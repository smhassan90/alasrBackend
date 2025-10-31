// Vercel serverless function entry point
// This wraps your Express app for Vercel deployment

require('dotenv').config();

let app;

try {
  // Initialize app
  app = require('../src/app');
  
  // Test if app is valid
  if (!app) {
    throw new Error('App initialization returned undefined');
  }
  
  // Export app for Vercel
  module.exports = app;
} catch (error) {
  // Log the full error for debugging
  console.error('=== VERCEL FUNCTION INITIALIZATION ERROR ===');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Error code:', error.code);
  console.error('Error stack:', error.stack);
  console.error('Environment:', process.env.NODE_ENV);
  console.error('DB_HOST:', process.env.DB_HOST || 'NOT SET');
  console.error('DB_PORT:', process.env.DB_PORT || 'NOT SET');
  console.error('DB_NAME:', process.env.DB_NAME || 'NOT SET');
  console.error('DB_USER:', process.env.DB_USER || 'NOT SET');
  console.error('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
  console.error('==========================================');
  
  // Return error handler that shows useful info
  const express = require('express');
  const errorApp = express();
  
  errorApp.use(express.json());
  
  // Catch all routes and return error
  errorApp.use((req, res) => {
    // Include error message in production for debugging
    const errorMessage = error.message || 'Unknown error';
    const errorStack = error.stack || 'No stack trace available';
    
    res.status(500).json({
      success: false,
      message: 'Application initialization error',
      error: errorMessage,
      // Include stack trace in production for Vercel debugging
      stack: errorStack,
      debug: {
        hasEnv: !!process.env.NODE_ENV,
        hasDbHost: !!process.env.DB_HOST,
        hasDbUser: !!process.env.DB_USER,
        hasDbPassword: !!process.env.DB_PASSWORD,
        dbHost: process.env.DB_HOST || 'NOT SET',
        dbPort: process.env.DB_PORT || 'NOT SET',
        dbName: process.env.DB_NAME || 'NOT SET',
        nodeEnv: process.env.NODE_ENV || 'NOT SET',
        // Include error type for better debugging
        errorType: error.name || 'Error',
        errorCode: error.code || 'NO_CODE'
      }
    });
  });
  
  module.exports = errorApp;
}

