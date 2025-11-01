const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Authenticate using API Key (for public apps without login)
 * Checks for API key in X-API-Key header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.authenticateApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
    const validApiKey = process.env.PUBLIC_API_KEY || process.env.API_KEY;

  if (!apiKey) {
      return responseHelper.unauthorized(res, 'API key is required');
    }

    if (!validApiKey) {
      logger.error('PUBLIC_API_KEY not configured in environment variables');
      return responseHelper.error(res, 'API key authentication not configured', 500);
    }

    if (apiKey !== validApiKey) {
      return responseHelper.unauthorized(res, 'Invalid API key');
    }

    // Mark request as authenticated with API key (no user)
    req.isApiKeyAuth = true;
    req.apiKeyAuth = true;

    next();
  } catch (error) {
    logger.error(`API key authentication error: ${error.message}`);
    return responseHelper.error(res, 'API key authentication failed', 401);
  }
};

/**
 * Optional API key authentication - allows either API key or JWT token
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.optionalApiKeyOrAuth = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.headers['X-API-Key'];
    const validApiKey = process.env.PUBLIC_API_KEY || process.env.API_KEY;

    // Check for API key first
    if (apiKey && validApiKey && apiKey === validApiKey) {
      req.isApiKeyAuth = true;
      req.apiKeyAuth = true;
      return next();
    }

    // If no valid API key, try JWT token (will be handled by optionalAuth middleware)
    // This allows either authentication method
    next();
  } catch (error) {
    // Don't fail, just continue (might have JWT token)
    next();
  }
};

