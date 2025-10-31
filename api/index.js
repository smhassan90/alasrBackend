// Vercel serverless function entry point
// This wraps your Express app for Vercel deployment

require('dotenv').config();

// Don't initialize database connection on load (serverless cold starts)
// Initialize it lazily when needed
let app;

try {
  app = require('../src/app');
  
  // Export app for Vercel
  module.exports = app;
} catch (error) {
  // Handle initialization errors gracefully
  console.error('Failed to initialize app:', error);
  
  // Return error handler
  const express = require('express');
  const errorApp = express();
  
  errorApp.use((req, res, next) => {
    res.status(500).json({
      success: false,
      message: 'Application initialization error',
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message
    });
  });
  
  module.exports = errorApp;
}

