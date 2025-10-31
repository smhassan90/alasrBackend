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
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  console.error('Environment:', process.env.NODE_ENV);
  console.error('DB_HOST:', process.env.DB_HOST);
  console.error('DB_USER:', process.env.DB_USER ? 'SET' : 'NOT SET');
  console.error('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');
  console.error('==========================================');
  
  // Return error handler that shows useful info
  const express = require('express');
  const errorApp = express();
  
  errorApp.use(express.json());
  
  // Catch all routes and return error
  errorApp.use((req, res) => {
    res.status(500).json({
      success: false,
      message: 'Application initialization error',
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error. Check Vercel function logs.' 
        : error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      debug: {
        hasEnv: !!process.env.NODE_ENV,
        hasDbHost: !!process.env.DB_HOST,
        hasDbUser: !!process.env.DB_USER,
        hasDbPassword: !!process.env.DB_PASSWORD,
        dbHost: process.env.DB_HOST || 'NOT SET',
        nodeEnv: process.env.NODE_ENV || 'NOT SET'
      }
    });
  });
  
  module.exports = errorApp;
}

