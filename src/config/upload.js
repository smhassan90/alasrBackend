require('dotenv').config();
const path = require('path');

module.exports = {
  uploadDir: process.env.UPLOAD_DIR || './uploads/profile-pictures',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
  allowedExtensions: ['.jpg', '.jpeg', '.png'],
  getDestination: function(req, file, cb) {
    cb(null, this.uploadDir);
  },
  getFilename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
};

