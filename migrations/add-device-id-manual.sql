-- Run this SQL directly on your production database
-- This adds the device_id column to the questions table

-- Add device_id column
ALTER TABLE questions 
ADD COLUMN device_id VARCHAR(255) NULL 
COMMENT 'Unique device identifier for anonymous users (hashed deviceId:platform:appVersion)' 
AFTER user_id;

-- Add index for device_id
CREATE INDEX questions_device_id_index ON questions(device_id);

