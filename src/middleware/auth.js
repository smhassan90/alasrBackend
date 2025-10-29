const jwt = require('jsonwebtoken');
const { User } = require('../models');
const jwtConfig = require('../config/jwt');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Authenticate JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return responseHelper.unauthorized(res, 'No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, jwtConfig.secret);

    // Get user from database
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password', 'reset_password_token', 'reset_password_expires', 'email_verification_token'] }
    });

    if (!user) {
      return responseHelper.unauthorized(res, 'User not found');
    }

    if (!user.is_active) {
      return responseHelper.forbidden(res, 'Account is deactivated');
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return responseHelper.unauthorized(res, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      return responseHelper.unauthorized(res, 'Token expired');
    }
    logger.error(`Authentication error: ${error.message}`);
    return responseHelper.error(res, 'Authentication failed', 401);
  }
};

/**
 * Generate JWT access token
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
exports.generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      name: user.name
    },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );
};

/**
 * Generate JWT refresh token
 * @param {Object} user - User object
 * @returns {string} JWT refresh token
 */
exports.generateRefreshToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email
    },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn }
  );
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {Object} Decoded token payload
 */
exports.verifyRefreshToken = (token) => {
  return jwt.verify(token, jwtConfig.refreshSecret);
};

/**
 * Optional authentication - attaches user if token exists but doesn't fail if not
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, jwtConfig.secret);

    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });

    if (user && user.is_active) {
      req.user = user;
      req.userId = user.id;
    }

    next();
  } catch (error) {
    // Don't fail, just continue without user
    next();
  }
};

