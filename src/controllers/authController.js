const crypto = require('crypto');
const axios = require('axios');
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

/**
 * Google OAuth redirect - initiates Google OAuth flow
 * @route GET /api/auth/google/redirect
 */
exports.googleRedirect = async (req, res) => {
  try {
    const redirectUri = req.query.redirect_uri || 'yoursalaah://auth/callback';
    const scope = req.query.scope || 'profile email openid';
    const accessType = req.query.access_type || 'offline';
    const prompt = req.query.prompt || 'consent';
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=${accessType}&` +
      `prompt=${prompt}&` +
      `state=${encodeURIComponent(JSON.stringify({ app_redirect_uri: redirectUri }))}`;
    
    res.redirect(googleAuthUrl);
  } catch (error) {
    logger.error(`Google redirect error: ${error.message}`);
    return responseHelper.error(res, 'Failed to initiate Google login', 500);
  }
};

/**
 * Google OAuth callback - handles Google OAuth callback
 * @route GET /api/auth/google/callback
 */
exports.googleCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      const stateData = req.query.state ? JSON.parse(decodeURIComponent(req.query.state)) : {};
      const errorRedirect = `${stateData.app_redirect_uri || 'yoursalaah://auth/callback'}?error=authentication_failed&error_description=${encodeURIComponent('No authorization code received')}`;
      return res.redirect(errorRedirect);
    }
    
    // Parse state to get app redirect URI
    const stateData = JSON.parse(decodeURIComponent(state || '{}'));
    const appRedirectUri = stateData.app_redirect_uri || 'yoursalaah://auth/callback';
    
    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    });
    
    const { access_token, refresh_token: googleRefreshToken } = tokenResponse.data;
    
    // Get user info from Google
    const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    
    const googleUser = userInfoResponse.data;
    // googleUser contains: id, email, verified_email, name, given_name, family_name, picture, locale
    
    // Create or update user in database
    let user = await User.findOne({ where: { email: googleUser.email } });
    
    if (!user) {
      // Create new user
      user = await User.create({
        email: googleUser.email,
        name: googleUser.name,
        profile_picture: googleUser.picture,
        auth_provider: 'google',
        google_id: googleUser.id,
        email_verified: googleUser.verified_email || true,
        is_active: true,
      });
      
      // Create default user settings
      await UserSettings.create({
        user_id: user.id
      });
      
      logger.info(`New user created via Google OAuth: ${user.email}`);
    } else {
      // Update existing user
      user.name = googleUser.name || user.name;
      user.profile_picture = googleUser.picture || user.profile_picture;
      user.google_id = googleUser.id;
      user.auth_provider = 'google';
      user.email_verified = googleUser.verified_email || user.email_verified;
      await user.save();
      
      logger.info(`User updated via Google OAuth: ${user.email}`);
    }
    
    // Check if user is active
    if (!user.is_active) {
      const errorRedirect = `${appRedirectUri}?error=account_deactivated&error_description=${encodeURIComponent('Account is deactivated')}`;
      return res.redirect(errorRedirect);
    }
    
    // Generate your app's JWT tokens
    const appAccessToken = generateToken(user);
    const appRefreshToken = generateRefreshToken(user);
    
    // Redirect to mobile app with tokens
    const redirectUrl = `${appRedirectUri}?provider=google&token=${appAccessToken}&refresh_token=${appRefreshToken}`;
    res.redirect(redirectUrl);
    
  } catch (error) {
    logger.error(`Google OAuth callback error: ${error.message}`);
    const stateData = req.query.state ? JSON.parse(decodeURIComponent(req.query.state)) : {};
    const errorRedirect = `${stateData.app_redirect_uri || 'yoursalaah://auth/callback'}?error=authentication_failed&error_description=${encodeURIComponent(error.message)}`;
    res.redirect(errorRedirect);
  }
};

/**
 * Google login - verifies Google access token directly (alternative endpoint)
 * @route POST /api/auth/google
 */
exports.googleLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;
    
    if (!accessToken) {
      return responseHelper.error(res, 'Google access token is required', 400);
    }
    
    // Verify token and get user info from Google
    const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const googleUser = userInfoResponse.data;
    
    // Create or update user
    let user = await User.findOne({ where: { email: googleUser.email } });
    
    if (!user) {
      user = await User.create({
        email: googleUser.email,
        name: googleUser.name,
        profile_picture: googleUser.picture,
        auth_provider: 'google',
        google_id: googleUser.id,
        email_verified: googleUser.verified_email || true,
        is_active: true,
      });
      
      // Create default user settings
      await UserSettings.create({
        user_id: user.id
      });
      
      logger.info(`New user created via Google login: ${user.email}`);
    } else {
      user.name = googleUser.name || user.name;
      user.profile_picture = googleUser.picture || user.profile_picture;
      user.google_id = googleUser.id;
      user.auth_provider = 'google';
      user.email_verified = googleUser.verified_email || user.email_verified;
      await user.save();
      
      logger.info(`User updated via Google login: ${user.email}`);
    }
    
    // Check if user is active
    if (!user.is_active) {
      return responseHelper.forbidden(res, 'Account is deactivated');
    }
    
    // Generate app tokens
    const appAccessToken = generateToken(user);
    const appRefreshToken = generateRefreshToken(user);
    
    return responseHelper.success(res, {
      user: user.toSafeObject(),
      accessToken: appAccessToken,
      refreshToken: appRefreshToken
    }, 'Login successful');
    
  } catch (error) {
    logger.error(`Google login error: ${error.message}`);
    if (error.response?.status === 401) {
      return responseHelper.unauthorized(res, 'Invalid Google access token');
    }
      return responseHelper.error(res, error.response?.data?.error_description || 'Failed to authenticate with Google', 401);
  }
};

/**
 * Delete user account with email and password (public endpoint)
 * @route POST /api/auth/delete-account
 */
exports.deleteAccount = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return responseHelper.unauthorized(res, 'Invalid email or password');
    }

    // Check if user is already deactivated
    if (!user.is_active) {
      return responseHelper.error(res, 'Account is already deactivated', 400);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return responseHelper.unauthorized(res, 'Invalid email or password');
    }

    // Soft delete - deactivate account
    user.is_active = false;
    await user.save();

    logger.info(`Account deleted via web page for user: ${user.email}`);

    return responseHelper.success(res, null, 'Account deleted successfully');
  } catch (error) {
    logger.error(`Delete account error: ${error.message}`);
    return responseHelper.error(res, 'Failed to delete account', 500, error.message);
  }
};

