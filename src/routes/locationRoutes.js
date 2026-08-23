const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const locationValidator = require('../validators/locationValidator');
const { validate } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/catalog', locationController.getLocationCatalog);

router.get(
  '/areas',
  locationValidator.listAreasValidator,
  validate,
  locationController.getAreas
);

router.post(
  '/areas',
  locationValidator.createAreaValidator,
  validate,
  locationController.createArea
);

module.exports = router;
