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

    // Validate required fields in service account
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    const missingFields = requiredFields.filter(field => !serviceAccount[field]);
    
    if (missingFields.length > 0) {
      logger.error(`Firebase service account is missing required fields: ${missingFields.join(', ')}`);
      firebaseInitialized = false;
      return;
    }

    // Check if Firebase app is already initialized
    if (admin.apps.length > 0) {
      logger.info('Firebase Admin SDK already initialized');
      firebaseInitialized = true;
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    firebaseInitialized = true;
    logger.info(`Firebase Admin SDK initialized successfully for project: ${serviceAccount.project_id}`);
  } catch (error) {
    logger.error(`Failed to initialize Firebase Admin SDK: ${error.message}`, error);
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
  // Ensure Firebase is initialized
  if (!firebaseInitialized) {
    initializeFirebase();
  }

  // Double-check initialization after attempting to initialize
  if (!firebaseInitialized || !admin.apps.length) {
    logger.error('Firebase not initialized. Cannot send push notification.');
    return { 
      success: false, 
      error: 'Firebase not initialized. Please check your FIREBASE_SERVICE_ACCOUNT_KEY environment variable and ensure it contains all required fields (project_id, private_key, client_email).',
      code: 'firebase_not_initialized'
    };
  }

  // Verify messaging service is available
  try {
    admin.messaging();
  } catch (error) {
    logger.error(`Firebase messaging service not available: ${error.message}`);
    return { 
      success: false, 
      error: `Firebase messaging service not available: ${error.message}`,
      code: 'firebase_messaging_unavailable'
    };
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
    logger.error(`Failed to send push notification: ${error.message}`, error);
    
    // Check for Firebase configuration errors (404 on /batch endpoint)
    if (error.message && (error.message.includes('404') || error.message.includes('batch') || error.message.includes('Not Found'))) {
      logger.error('Firebase configuration error detected. Please verify service account key has all required fields including project_id.');
      return { 
        success: false, 
        error: 'Firebase configuration error: Service account may be missing required fields (project_id, private_key, client_email). Please verify your FIREBASE_SERVICE_ACCOUNT_KEY environment variable.',
        code: 'firebase_config_error'
      };
    }
    
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
  // Ensure Firebase is initialized
  if (!firebaseInitialized) {
    initializeFirebase();
  }

  // Double-check initialization after attempting to initialize
  if (!firebaseInitialized || !admin.apps.length) {
    logger.error('Firebase not initialized. Cannot send push notifications.');
    return { 
      success: false, 
      error: 'Firebase not initialized. Please check your FIREBASE_SERVICE_ACCOUNT_KEY environment variable and ensure it contains all required fields (project_id, private_key, client_email).',
      code: 'firebase_not_initialized',
      results: [] 
    };
  }

  // Verify messaging service is available
  try {
    admin.messaging();
  } catch (error) {
    logger.error(`Firebase messaging service not available: ${error.message}`);
    return { 
      success: false, 
      error: `Firebase messaging service not available: ${error.message}`,
      code: 'firebase_messaging_unavailable',
      results: [] 
    };
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
      
      try {
        const batchResponse = await admin.messaging().sendAll(batch);
        
        results.push(...batchResponse.responses.map((response, index) => ({
          token: batch[index].token,
          success: response.success,
          error: response.error
        })));
      } catch (batchError) {
        // If batch send fails, mark all tokens in this batch as failed
        logger.error(`Failed to send batch ${i / batchSize + 1}: ${batchError.message}`);
        
        // Check if it's a Firebase initialization/configuration error
        if (batchError.message && (batchError.message.includes('404') || batchError.message.includes('batch'))) {
          logger.error('Firebase configuration error detected. Please verify service account key has all required fields including project_id.');
          return { 
            success: false, 
            error: 'Firebase configuration error: Service account may be missing required fields (project_id, private_key, client_email). Please verify your FIREBASE_SERVICE_ACCOUNT_KEY.',
            code: 'firebase_config_error',
            results: []
          };
        }
        
        // For other errors, mark all tokens in batch as failed
        batch.forEach(msg => {
          results.push({
            token: msg.token,
            success: false,
            error: batchError.message
          });
        });
      }
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
    logger.error(`Failed to send batch push notifications: ${error.message}`, error);
    
    // Check for Firebase configuration errors
    if (error.message && (error.message.includes('404') || error.message.includes('batch') || error.message.includes('Not Found'))) {
      return { 
        success: false, 
        error: 'Firebase configuration error: Service account may be missing required fields (project_id, private_key, client_email). Please verify your FIREBASE_SERVICE_ACCOUNT_KEY environment variable.',
        code: 'firebase_config_error',
        results: []
      };
    }
    
    return { success: false, error: error.message, code: error.code, results: [] };
  }
};

/**
 * Get Firebase initialization status
 * @returns {Object} Status information about Firebase initialization
 */
exports.getFirebaseStatus = () => {
  const firebaseKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const status = {
    initialized: firebaseInitialized,
    appsCount: admin.apps.length,
    envPresent: !!firebaseKey,
    parsedJson: false,
    hasRequiredFields: false,
    missingFields: [],
    projectId: null,
    error: null
  };

  if (!firebaseKey) {
    status.error = 'FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment variables.';
    return status;
  }

  // Try to parse the service account
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(firebaseKey);
    status.parsedJson = true;
  } catch (e) {
    status.error = 'Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON.';
    return status;
  }

  // Check required fields
  const requiredFields = ['project_id', 'private_key', 'client_email'];
  status.missingFields = requiredFields.filter(field => !serviceAccount[field]);
  status.hasRequiredFields = status.missingFields.length === 0;
  status.projectId = serviceAccount.project_id || null;

  if (status.missingFields.length > 0) {
    status.error = `Missing required fields: ${status.missingFields.join(', ')}`;
  }

  return status;
};

// Initialize Firebase on module load
initializeFirebase();

module.exports = exports;

