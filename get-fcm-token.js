/**
 * Script to generate FCM OAuth 2.0 access token for HTTP v1 API
 * 
 * Usage:
 *   1. Make sure you have firebase-admin installed: npm install firebase-admin
 *   2. Run: node get-fcm-token.js
 *   3. Copy the token and use it in Postman Authorization header
 */

const admin = require('firebase-admin');
const path = require('path');

// Load service account
const serviceAccountPath = path.join(__dirname, 'al-asr-masajid-prayer-timings-firebase-adminsdk-fbsvc-f51b6a343a.json');

let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  console.error('Error loading service account file:', error.message);
  console.error('Make sure the file exists at:', serviceAccountPath);
  process.exit(1);
}

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  process.exit(1);
}

// Get access token
async function getAccessToken() {
  try {
    const credential = admin.app().options.credential;
    
    // Get access token
    const tokenResponse = await credential.getAccessToken();
    
    if (tokenResponse && tokenResponse.access_token) {
      console.log('\n✅ Access Token Generated Successfully!\n');
      console.log('='.repeat(60));
      console.log('TOKEN (use in Postman Authorization header):');
      console.log('='.repeat(60));
      console.log(tokenResponse.access_token);
      console.log('='.repeat(60));
      console.log('\n📋 Postman Setup:');
      console.log('   Header: Authorization');
      console.log('   Value: Bearer ' + tokenResponse.access_token);
      console.log('\n⏰ Token expires in: ~1 hour');
      console.log('   Run this script again to get a new token\n');
      
      return tokenResponse.access_token;
    } else {
      console.error('❌ Failed to get access token');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error getting access token:', error.message);
    if (error.code === 'app/invalid-credential') {
      console.error('\n💡 Make sure:');
      console.error('   1. Service account has Firebase Admin permissions');
      console.error('   2. Firebase Cloud Messaging API is enabled');
      console.error('   3. Service account JSON file is valid\n');
    }
    process.exit(1);
  }
}

// Run
getAccessToken()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

