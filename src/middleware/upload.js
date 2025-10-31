const multer = require('multer');
const path = require('path');
const fs = require('fs');
const uploadConfig = require('../config/upload');
const responseHelper = require('../utils/responseHelper');

// Check if we're in a serverless environment (Vercel, AWS Lambda, etc.)
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.SERVERLESS;

// Configure storage based on environment
let storage;

if (isServerless) {
  // Use memory storage in serverless (files are stored in memory)
  // Note: For production serverless, you should upload to cloud storage (S3, Cloudinary, etc.)
  storage = multer.memoryStorage();
  console.warn('⚠️ Using memory storage for uploads (serverless environment). Files will not persist.');
} else {
  // Use disk storage in non-serverless environments
  // Ensure upload directory exists
  const uploadDir = uploadConfig.uploadDir;
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + req.userId + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });
  } catch (error) {
    console.warn('Could not set up disk storage, using memory storage:', error.message);
    storage = multer.memoryStorage();
  }
}

// File filter
const fileFilter = (req, file, cb) => {
  if (uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, JPG, and PNG images are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  limits: {
    fileSize: uploadConfig.maxFileSize
  },
  fileFilter: fileFilter
});

/**
 * Middleware to handle single file upload
 */
exports.uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadSingle = upload.single(fieldName);
    
    uploadSingle(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return responseHelper.error(res, 'File size exceeds maximum allowed size (5MB)', 400);
        }
        return responseHelper.error(res, err.message, 400);
      } else if (err) {
        return responseHelper.error(res, err.message, 400);
      }
      next();
    });
  };
};

/**
 * Delete file from filesystem
 * @param {string} filePath - Path to file
 */
exports.deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

/**
 * Get file URL
 * @param {string} filename - Filename
 * @returns {string} File URL
 */
exports.getFileUrl = (filename) => {
  return `${process.env.BASE_URL}/uploads/profile-pictures/${filename}`;
};

