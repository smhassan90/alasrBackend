const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const eventValidator = require('../validators/eventValidator');
const { validate } = require('../middleware/validation');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { optionalApiKeyOrAuth } = require('../middleware/apiKeyAuth');
const { isMasjidMember, isMasjidImamOrAdmin, canManageMasjid, canCreateEvents } = require('../middleware/masjidAuth');

// Allow API key or JWT token for read endpoints (GET requests)
// For write endpoints (POST, PUT, DELETE), still require JWT authentication
router.use((req, res, next) => {
  // For GET requests, allow API key or JWT
  if (req.method === 'GET') {
    return optionalApiKeyOrAuth(req, res, () => {
      optionalAuth(req, res, next);
    });
  }
  // For other methods, require JWT authentication
  return authenticate(req, res, next);
});

// Get all events for masjid (member check)
router.get('/masjid/:masjidId', eventValidator.masjidIdParamValidator, validate, isMasjidMember, eventController.getEventsByMasjid);

// Get upcoming events (member check)
router.get('/masjid/:masjidId/upcoming', eventValidator.masjidIdParamValidator, validate, isMasjidMember, eventController.getUpcomingEvents);

// Get past events (member check)
router.get('/masjid/:masjidId/past', eventValidator.masjidIdParamValidator, validate, isMasjidMember, eventController.getPastEvents);

// Get single event (member check - checked in controller)
router.get('/:id', eventValidator.eventIdValidator, validate, eventController.getEventById);

// Create event (requires can_create_events permission)
router.post('/', eventValidator.createEventValidator, validate, canCreateEvents, eventController.createEvent);

// Update event (requires can_create_events permission)
router.put('/:id', eventValidator.updateEventValidator, validate, eventController.updateEvent);

// Delete event (admin only)
router.delete('/:id', eventValidator.eventIdValidator, validate, eventController.deleteEvent);

module.exports = router;

