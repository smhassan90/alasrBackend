require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'your_jwt_secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret',
  expiresIn: process.env.JWT_EXPIRE || '1h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
};

