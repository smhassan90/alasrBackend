require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret',
  expiresIn: null, // Tokens never expire
  refreshExpiresIn: null // Refresh tokens never expire
};

