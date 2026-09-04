const { body, param } = require('express-validator');

const afterPrayerValues = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Jummah'];

exports.createEventValidator = [
  body('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID'),

  body('name')
    .trim()
    .notEmpty().withMessage('Event name is required')
    .isLength({ min: 3, max: 255 }).withMessage('Event name must be between 3 and 255 characters'),

  body('description')
    .optional()
    .trim(),

  body('eventType')
    .optional()
    .isIn(['one_time', 'recurring']).withMessage('Event type must be either one_time or recurring'),

  body('dayOfWeek')
    .if((value, { req }) => {
      if (req.body.eventType !== 'recurring') {
        return false;
      }
      const days = req.body.daysOfWeek;
      return !Array.isArray(days) || days.length === 0;
    })
    .exists({ values: 'null' }).withMessage('Day of week is required for recurring events')
    .isInt({ min: 0, max: 6 }).withMessage('Day of week must be between 0 (Sunday) and 6 (Saturday)')
    .toInt(),

  body('daysOfWeek')
    .optional()
    .isArray({ min: 1 }).withMessage('Select at least one day')
    .custom((days) => {
      if (!Array.isArray(days)) {
        return true;
      }
      const valid = days.every(d => Number.isInteger(Number(d)) && Number(d) >= 0 && Number(d) <= 6);
      if (!valid) {
        throw new Error('Each day must be between 0 (Sunday) and 6 (Saturday)');
      }
      return true;
    }),

  body('eventDate')
    .if(body('eventType').not().equals('recurring'))
    .notEmpty().withMessage('Event date is required for one_time events.')
    .isISO8601().withMessage('Invalid date format. Use YYYY-MM-DD')
    .toDate(),

  body('timeMode')
    .optional()
    .isIn(['fixed', 'after_prayer']).withMessage('Time mode must be fixed or after_prayer'),

  body('afterPrayer')
    .if(body('timeMode').equals('after_prayer'))
    .notEmpty().withMessage('Prayer name is required for after-prayer events')
    .isIn(afterPrayerValues).withMessage(`Prayer must be one of: ${afterPrayerValues.join(', ')}`),

  body('minutesAfter')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 180 }).withMessage('Minutes after must be between 0 and 180')
    .toInt(),

  body('eventTime')
    .if((value, { req }) => (req.body.timeMode || 'fixed') !== 'after_prayer')
    .notEmpty().withMessage('Event time is required')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format. Use HH:MM (24-hour format)'),

  body('location')
    .optional()
    .trim()
];

exports.updateEventValidator = [
  param('id')
    .notEmpty().withMessage('Event ID is required')
    .isUUID().withMessage('Invalid event ID'),

  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Event name cannot be empty')
    .isLength({ min: 3, max: 255 }).withMessage('Event name must be between 3 and 255 characters'),

  body('description')
    .optional()
    .trim(),

  body('eventType')
    .optional()
    .isIn(['one_time', 'recurring']).withMessage('Event type must be either one_time or recurring'),

  body('dayOfWeek')
    .optional()
    .isInt({ min: 0, max: 6 }).withMessage('Day of week must be between 0 (Sunday) and 6 (Saturday)'),

  body('eventDate')
    .optional()
    .isISO8601().withMessage('Invalid date format. Use YYYY-MM-DD')
    .toDate(),

  body('timeMode')
    .optional()
    .isIn(['fixed', 'after_prayer']).withMessage('Time mode must be fixed or after_prayer'),

  body('afterPrayer')
    .optional()
    .isIn(afterPrayerValues).withMessage(`Prayer must be one of: ${afterPrayerValues.join(', ')}`),

  body('minutesAfter')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 180 }).withMessage('Minutes after must be between 0 and 180')
    .toInt(),

  body('eventTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Invalid time format. Use HH:MM (24-hour format)'),

  body('location')
    .optional()
    .trim()
];

exports.eventIdValidator = [
  param('id')
    .notEmpty().withMessage('Event ID is required')
    .isUUID().withMessage('Invalid event ID')
];

exports.masjidIdParamValidator = [
  param('masjidId')
    .notEmpty().withMessage('Masjid ID is required')
    .isUUID().withMessage('Invalid masjid ID')
];
