const crypto = require('crypto');

/**
 * Generate a unique device ID from device information
 * @param {string} deviceId - Device ID from the device (e.g., Android ID, iOS IDFV)
 * @param {string} platform - Platform (android, ios, web)
 * @param {string} appVersion - App version (optional)
 * @returns {string} Unique device identifier
 */
exports.generateDeviceId = (deviceId, platform, appVersion = '') => {
  if (!deviceId || !platform) {
    throw new Error('Device ID and platform are required');
  }

  // Create a unique identifier by combining device ID, platform, and app version
  const combined = `${deviceId}:${platform}:${appVersion}`;
  
  // Hash it to create a consistent, unique identifier
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  
  // Return first 32 characters for readability (still unique enough)
  return hash.substring(0, 32);
};

/**
 * Validate device ID format
 * @param {string} deviceId - Device ID to validate
 * @returns {boolean}
 */
exports.isValidDeviceId = (deviceId) => {
  return typeof deviceId === 'string' && deviceId.length >= 16 && deviceId.length <= 255;
};

