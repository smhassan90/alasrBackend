const { body, param } = require('express-validator');

exports.createPrayerTimeValidator = [
  body('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('prayerName')
    .notEmpty().withMessage('Prayer name is required')
    .isIn(['Fajr', 'Dhuhr', 'Jummah', 'Asr', 'Maghrib', 'Isha']).withMessage('Invalid prayer name. Must be one of: Fajr, Dhuhr, Jummah, Asr, Maghrib, Isha'),
  
  body('prayerTime')
    .notEmpty().withMessage('Prayer time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format. Use HH:MM (24-hour format)'),
  
  body('effectiveDate')
    .optional()
    .isISO8601().withMessage('Invalid date format. Use YYYY-MM-DD')
    .toDate()
];

exports.updatePrayerTimeValidator = [
  param('id')
    .notEmpty().withMessage('Prayer time ID is required')
    .isUUID().withMessage('Invalid prayer time ID'),
  
  body('prayerTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format. Use HH:MM (24-hour format)'),
  
  body('effectiveDate')
    .optional()
    .isISO8601().withMessage('Invalid date format. Use YYYY-MM-DD')
    .toDate()
];

exports.bulkUpdateValidator = [
  body('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),
  
  body('prayerTimes')
    .isArray({ min: 1 }).withMessage('Prayer times array is required and must not be empty'),
  
  body('prayerTimes.*.prayerName')
    .notEmpty().withMessage('Prayer name is required')
    .isIn(['Fajr', 'Dhuhr', 'Jummah', 'Asr', 'Maghrib', 'Isha']).withMessage('Invalid prayer name'),
  
  body('prayerTimes.*.prayerTime')
    .notEmpty().withMessage('Prayer time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format. Use HH:MM (24-hour format)'),
  
  body('effectiveDate')
    .optional()
    .isISO8601().withMessage('Invalid date format. Use YYYY-MM-DD')
    .toDate()
];

exports.masjidIdParamValidator = [
  param('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID')
];

