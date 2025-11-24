const { DeviceSettings } = require('../models');
const responseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

/**
 * Get device notification settings
 * @route GET /api/device-settings
 * No authentication required - uses deviceId query parameter
 */
exports.getDeviceSettings = async (req, res) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return responseHelper.error(res, 'Device ID is required', 400);
    }

    let settings = await DeviceSettings.findOne({
      where: { device_id: deviceId }
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await DeviceSettings.create({
        device_id: deviceId
      });
    }

    return responseHelper.success(res, settings, 'Settings retrieved successfully');
  } catch (error) {
    logger.error(`Get device settings error: ${error.message}`);
    return responseHelper.error(res, 'Failed to retrieve settings', 500);
  }
};

/**
 * Update device notification settings
 * @route PUT /api/device-settings
 * No authentication required - uses deviceId in body
 */
exports.updateDeviceSettings = async (req, res) => {
  try {
    const { deviceId } = req.body;
    const {
      prayer_times_notifications,
      events_notifications,
      donations_notifications,
      general_notifications,
      questions_notifications
    } = req.body;

    if (!deviceId) {
      return responseHelper.error(res, 'Device ID is required', 400);
    }

    let settings = await DeviceSettings.findOne({
      where: { device_id: deviceId }
    });

    if (!settings) {
      settings = await DeviceSettings.create({
        device_id: deviceId
      });
    }

    // Update settings
    if (prayer_times_notifications !== undefined) settings.prayer_times_notifications = prayer_times_notifications;
    if (events_notifications !== undefined) settings.events_notifications = events_notifications;
    if (donations_notifications !== undefined) settings.donations_notifications = donations_notifications;
    if (general_notifications !== undefined) settings.general_notifications = general_notifications;
    if (questions_notifications !== undefined) settings.questions_notifications = questions_notifications;

    await settings.save();

    logger.info(`Device settings updated for device: ${deviceId}`);

    return responseHelper.success(res, settings, 'Settings updated successfully');
  } catch (error) {
    logger.error(`Update device settings error: ${error.message}`);
    return responseHelper.error(res, 'Failed to update settings', 500);
  }
};

