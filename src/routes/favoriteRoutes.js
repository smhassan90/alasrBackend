const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');
const favoriteValidator = require('../validators/favoriteValidator');
const { validate } = require('../middleware/validation');
const { optionalAuth } = require('../middleware/auth');
const { optionalApiKeyOrAuth } = require('../middleware/apiKeyAuth');

// Public endpoint - Get app config (allows API key or no auth)
router.get('/config/app', optionalApiKeyOrAuth, favoriteController.getAppConfig);

// Favorites routes - support both authenticated and anonymous users
// Require either JWT token OR device_id + platform
router.get('/users/favorites', 
  favoriteValidator.getFavoritesValidator,
  validate,
  optionalAuth,
  favoriteController.getFavorites
);

router.post('/users/favorites',
  favoriteValidator.addFavoriteValidator,
  validate,
  optionalAuth,
  favoriteController.addFavorite
);

router.delete('/users/favorites/:masjidId',
  favoriteValidator.removeFavoriteValidator,
  validate,
  optionalAuth,
  favoriteController.removeFavorite
);

module.exports = router;

