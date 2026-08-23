const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const eventValidator = require('../validators/eventValidator');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { isMasjidMember } = require('../middleware/masjidAuth');

router.use(authenticate);

router.get(
  '/masjid/:masjidId',
  eventValidator.masjidIdParamValidator,
  validate,
  isMasjidMember,
  activityLogController.getMasjidLogs
);

module.exports = router;
