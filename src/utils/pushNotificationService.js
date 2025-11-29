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

  // Validate title and body are not empty - don't send notifications with empty titles
  const trimmedTitle = (title || '').toString().trim();
  const trimmedBody = (body || '').toString().trim();
  
  if (!trimmedTitle) {
    logger.warn('Notification title is missing or empty. Push notification not sent.');
    return { success: false, error: 'Notification title is required and cannot be empty' };
  }
  
  if (!trimmedBody) {
    logger.warn('Notification body is missing or empty. Push notification not sent.');
    return { success: false, error: 'Notification body is required and cannot be empty' };
  }

  try {
    const message = {
      notification: {
        title: trimmedTitle,
        body: trimmedBody
        // Note: 'sound' is not allowed in top-level notification object
        // Sound is configured in platform-specific sections (android/apns) below
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
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: 'public'
        }
      },
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
            alert: {
              title: trimmedTitle,
              body: trimmedBody
            }
          }
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

  // Validate title and body are not empty - don't send notifications with empty titles
  const trimmedTitle = (title || '').toString().trim();
  const trimmedBody = (body || '').toString().trim();
  
  if (!trimmedTitle) {
    logger.warn('Notification title is missing or empty. Push notifications not sent.');
    return { success: false, error: 'Notification title is required and cannot be empty', results: [] };
  }
  
  if (!trimmedBody) {
    logger.warn('Notification body is missing or empty. Push notifications not sent.');
    return { success: false, error: 'Notification body is required and cannot be empty', results: [] };
  }

  logger.info(`Attempting to send push notifications to ${validTokens.length} tokens`);

  try {
    const createMessage = token => ({
      notification: {
        title: trimmedTitle,
        body: trimmedBody
        // Note: 'sound' is not allowed in top-level notification object
        // Sound is configured in platform-specific sections (android/apns) below
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
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
          visibility: 'public'
        }
      },
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            contentAvailable: true,
            alert: {
              title: trimmedTitle,
              body: trimmedBody
            }
          }
        }
      }
    });

    // Send sequentially in manageable chunks to avoid /batch endpoint
    const chunkSize = 100;
    const results = [];
    
    for (let i = 0; i < validTokens.length; i += chunkSize) {
      const chunk = validTokens.slice(i, i + chunkSize);
      logger.debug(`Sending chunk ${i / chunkSize + 1} (${chunk.length} tokens)`);

      const chunkPromises = chunk.map(async token => {
        const message = createMessage(token);

        try {
          const messageId = await admin.messaging().send(message);
          return {
            token,
            success: true,
            messageId
          };
        } catch (error) {
          // Mask token for logging (show first 10 and last 10 chars)
          const maskedToken = token ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}` : 'N/A';
          logger.error(`Failed to send notification to token ${maskedToken}: ${error.message}`, {
            code: error.code,
            errorType: error.code || 'unknown'
          });

          // Identify auth/config errors once to return immediately
          const errorMsg = error.message || '';
          const isConfigError = (
            (errorMsg.includes('404') && errorMsg.includes('/batch')) ||
            (errorMsg.includes('Not Found') && errorMsg.includes('/batch')) ||
            (errorMsg.includes('404') && errorMsg.includes('batch') && errorMsg.includes('URL')) ||
            error.code === 'app/invalid-credential' ||
            error.code === 'app/invalid-argument'
          );

          if (isConfigError) {
            throw Object.assign(new Error(error.message), {
              code: error.code || 'firebase_api_error',
              originalError: error.message,
              isConfigError: true
            });
          }

          return {
            token,
            success: false,
            error: {
              code: error.code || 'unknown',
              message: error.message || 'Unknown error occurred'
            }
          };
        }
      });

      try {
        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults);
      } catch (chunkError) {
        if (chunkError.isConfigError) {
          const errorMessage = `Firebase Cloud Messaging API error: ${chunkError.message}. Possible causes: 1) Cloud Messaging API not enabled for your Firebase project, 2) Service account lacks IAM permissions (needs "Firebase Cloud Messaging API Service Agent" role), 3) Project ID mismatch.`;
          
          return {
            success: false,
            error: errorMessage,
            code: chunkError.code,
            originalError: chunkError.originalError,
            results: []
          };
        }

        // Unexpected rejection - log and continue
        logger.error('Unexpected error while sending chunk:', {
          message: chunkError.message,
          code: chunkError.code,
          stack: chunkError.stack
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    // Log summary of failures by error type
    if (failureCount > 0) {
      const errorSummary = {};
      results.filter(r => !r.success).forEach(r => {
        const errorCode = r.error?.code || 'unknown';
        errorSummary[errorCode] = (errorSummary[errorCode] || 0) + 1;
      });
      logger.warn(`Batch push notifications completed: ${successCount} successful, ${failureCount} failed. Error breakdown:`, errorSummary);
    } else {
      logger.info(`Batch push notifications sent: ${successCount} successful, ${failureCount} failed`);
    }
    
    return { 
      success: true, 
      total: results.length,
      successful: successCount,
      failed: failureCount,
      results: results
    };
  } catch (error) {
    // Log full error details for debugging
    logger.error(`Failed to send batch push notifications:`, {
      message: error.message,
      code: error.code,
      stack: error.stack,
      error: error
    });
    
    // Check for Firebase configuration errors (more specific check)
    const errorMsg = error.message || '';
    const isConfigError = (
      (errorMsg.includes('404') && errorMsg.includes('/batch')) ||
      (errorMsg.includes('Not Found') && errorMsg.includes('/batch')) ||
      (errorMsg.includes('404') && errorMsg.includes('batch') && errorMsg.includes('URL')) ||
      error.code === 'app/invalid-credential' ||
      error.code === 'app/invalid-argument'
    );
    
    if (isConfigError) {
      const errorMessage = `Firebase Cloud Messaging API error: ${error.message}. Possible causes: 1) Cloud Messaging API not enabled for your Firebase project, 2) Service account lacks IAM permissions (needs "Firebase Cloud Messaging API Service Agent" role), 3) Project ID mismatch.`;
      
      return { 
        success: false, 
        error: errorMessage,
        code: error.code || 'firebase_api_error',
        originalError: error.message,
        details: {
          code: error.code,
          name: error.name
        },
        results: []
      };
    }
    
    return { 
      success: false, 
      error: error.message, 
      code: error.code, 
      originalError: error.message,
      results: [] 
    };
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

