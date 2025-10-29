const crypto = require('crypto');
const { User, UserSettings } = require('../models');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/auth');
const responseHelper = require('../utils/responseHelper');
const emailService = require('../utils/emailService');
const logger = require('../utils/logger');

/**
 * Register a new user
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return responseHelper.error(res, 'Email already registered', 400);
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone
    });

    // Create default user settings
    await UserSettings.create({
      user_id: user.id
    });

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.email_verification_token = verificationToken;
    await user.save();

    // Send welcome email (async, don't wait)
    emailService.sendWelcomeEmail(user.email, user.name).catch(err => 
      logger.error(`Failed to send welcome email: ${err.message}`)
    );

    // Send verification email
    emailService.sendEmailVerification(user.email, verificationToken).catch(err =>
      logger.error(`Failed to send verification email: ${err.message}`)
    );

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    return responseHelper.success(res, {
      user: user.toSafeObject(),
      accessToken,
      refreshToken
    }, 'User registered successfully', 201);
  } catch (error) {
    logger.error(`Register error: ${error.message}`);
    return responseHelper.error(res, 'Registration failed', 500, error.message);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return responseHelper.unauthorized(res, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      return responseHelper.forbidden(res, 'Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return responseHelper.unauthorized(res, 'Invalid email or password');
    }

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    logger.info(`User logged in: ${user.email}`);

    return responseHelper.success(res, {
      user: user.toSafeObject(),
      accessToken,
      refreshToken
    }, 'Login successful');
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    return responseHelper.error(res, 'Login failed', 500, error.message);
  }
};

/**
 * Logout user (client-side token removal)
 * @route POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    logger.info(`User logged out: ${req.user.email}`);
    return responseHelper.success(res, null, 'Logout successful');
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    return responseHelper.error(res, 'Logout failed', 500, error.message);
  }
};

/**
 * Refresh access token
 * @route POST /api/auth/refresh-token
 */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return responseHelper.error(res, 'Refresh token is required', 400);
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Get user
    const user = await User.findByPk(decoded.id);
    if (!user || !user.is_active) {
      return responseHelper.unauthorized(res, 'Invalid refresh token');
    }

    // Generate new tokens
    const newAccessToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    return responseHelper.success(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    }, 'Token refreshed successfully');
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return responseHelper.unauthorized(res, 'Refresh token expired');
    }
    logger.error(`Refresh token error: ${error.message}`);
    return responseHelper.unauthorized(res, 'Invalid refresh token');
  }
};

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return responseHelper.success(res, null, 'If the email exists, a password reset link has been sent');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.reset_password_token = resetToken;
    user.reset_password_expires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // Send reset email
    await emailService.sendPasswordResetEmail(user.email, resetToken);

    return responseHelper.success(res, null, 'If the email exists, a password reset link has been sent');
  } catch (error) {
    logger.error(`Forgot password error: ${error.message}`);
    return responseHelper.error(res, 'Failed to process password reset request', 500);
  }
};

/**
 * Reset password with token
 * @route POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({
      where: {
        reset_password_token: token
      }
    });

    if (!user) {
      return responseHelper.error(res, 'Invalid or expired reset token', 400);
    }

    // Check if token is expired
    if (user.reset_password_expires < new Date()) {
      return responseHelper.error(res, 'Reset token has expired', 400);
    }

    // Update password
    user.password = password;
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await user.save();

    logger.info(`Password reset successful for user: ${user.email}`);

    return responseHelper.success(res, null, 'Password reset successful');
  } catch (error) {
    logger.error(`Reset password error: ${error.message}`);
    return responseHelper.error(res, 'Failed to reset password', 500);
  }
};

/**
 * Verify email address
 * @route POST /api/auth/verify-email
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      where: {
        email_verification_token: token
      }
    });

    if (!user) {
      return responseHelper.error(res, 'Invalid verification token', 400);
    }

    // Mark email as verified
    user.email_verified = true;
    user.email_verification_token = null;
    await user.save();

    logger.info(`Email verified for user: ${user.email}`);

    return responseHelper.success(res, null, 'Email verified successfully');
  } catch (error) {
    logger.error(`Email verification error: ${error.message}`);
    return responseHelper.error(res, 'Failed to verify email', 500);
  }
};

