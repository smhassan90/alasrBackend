const { User } = require('../models');
const logger = require('../utils/logger');

/**
 * Middleware to bypass rate limiting for super admins
 * Attach this BEFORE rate limiter middleware
 */
exports.bypassRateLimitForSuperAdmin = async (req, res, next) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token) {
        const jwt = require('jsonwebtoken');
        
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          
          // Check if user is super admin
          const user = await User.findByPk(decoded.userId);
          
          if (user && user.is_super_admin) {
            // Skip rate limiting for super admins
            req.skipRateLimit = true;
            logger.debug(`Rate limit bypassed for super admin: ${user.email}`);
          }
        } catch (jwtError) {
          // Invalid token, continue normally (rate limit will apply)
        }
      }
    }
    
    next();
  } catch (error) {
    // On error, just continue (don't block the request)
    next();
  }
};

