const admin = require('firebase-admin');
const logger = require('./logger');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) {
    return;
  }

  try {
    // Check if Firebase credentials are provided
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      logger.warn('Firebase service account key not found. Push notifications will be disabled.');
      return;
    }

    // Parse the service account key (can be JSON string or path to JSON file)
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } catch (e) {
      // If parsing fails, assume it's a file path
      serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    firebaseInitialized = true;
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
    firebaseInitialized = false;
  }
};

/**
 * Send push notification to a single FCM token
 * @param {string} fcmToken - FCM token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
exports.sendPushNotification = async (fcmToken, title, body, data = {}) => {
  if (!firebaseInitialized) {
    initializeFirebase();
  }

  if (!firebaseInitialized || !admin.apps.length) {
    logger.warn('Firebase not initialized. Push notification not sent.');
    return { success: false, error: 'Firebase not initialized' };
  }

  if (!fcmToken) {
    logger.warn('FCM token is missing. Push notification not sent.');
    return { success: false, error: 'FCM token is missing' };
  }

  try {
    const message = {
      notification: {
        title: title,
        body: body
      },
      data: {
        ...data,
        // Convert all data values to strings (FCM requirement)
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key] || '');
          return acc;
        }, {})
      },
      token: fcmToken,
      android: {
        priority: 'high'
      },
      apns: {
        headers: {
          'apns-priority': '10'
        }
      }
    };

    const response = await admin.messaging().send(message);
    logger.info(`Push notification sent successfully: ${response}`);
    return { success: true, messageId: response };
  } catch (error) {
    logger.error(`Failed to send push notification: ${error.message}`);
    
    // Handle invalid token errors
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      logger.warn(`Invalid FCM token: ${fcmToken}`);
      return { success: false, error: 'Invalid FCM token', code: error.code };
    }
    
    return { success: false, error: error.message, code: error.code };
  }
};

/**
 * Send push notifications to multiple FCM tokens
 * @param {Array<string>} fcmTokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
exports.sendBatchPushNotifications = async (fcmTokens, title, body, data = {}) => {
  if (!firebaseInitialized) {
    initializeFirebase();
  }

  if (!firebaseInitialized || !admin.apps.length) {
    logger.warn('Firebase not initialized. Push notifications not sent.');
    return { success: false, error: 'Firebase not initialized', results: [] };
  }

  if (!fcmTokens || fcmTokens.length === 0) {
    logger.warn('No FCM tokens provided. Push notifications not sent.');
    return { success: false, error: 'No FCM tokens provided', results: [] };
  }

  // Filter out null/undefined tokens
  const validTokens = fcmTokens.filter(token => token && token.trim() !== '');
  
  if (validTokens.length === 0) {
    logger.warn('No valid FCM tokens provided.');
    return { success: false, error: 'No valid FCM tokens', results: [] };
  }

  try {
    const messages = validTokens.map(token => ({
      notification: {
        title: title,
        body: body
      },
      data: {
        ...data,
        ...Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key] || '');
          return acc;
        }, {})
      },
      token: token,
      android: {
        priority: 'high'
      },
      apns: {
        headers: {
          'apns-priority': '10'
        }
      }
    }));

    // Send in batches (FCM allows up to 500 messages per batch)
    const batchSize = 500;
    const results = [];
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      const batchResponse = await admin.messaging().sendAll(batch);
      
      results.push(...batchResponse.responses.map((response, index) => ({
        token: batch[index].token,
        success: response.success,
        error: response.error
      })));
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    logger.info(`Batch push notifications sent: ${successCount} successful, ${failureCount} failed`);
    
    return { 
      success: true, 
      total: results.length,
      successful: successCount,
      failed: failureCount,
      results: results
    };
  } catch (error) {
    logger.error(`Failed to send batch push notifications: ${error.message}`);
    return { success: false, error: error.message, results: [] };
  }
};

// Initialize Firebase on module load
initializeFirebase();

module.exports = exports;

