const { AppConfig } = require('../models');

const TTL_MS = 5 * 60 * 1000;
let cachedLimit = null;
let cachedAt = 0;

/**
 * In-process TTL cache for the high-frequency max_favorites_limit config.
 * Safe on Vercel: worst case each isolate refreshes independently.
 */
async function getMaxFavoritesLimit() {
  const now = Date.now();
  if (cachedLimit !== null && now - cachedAt < TTL_MS) {
    return cachedLimit;
  }

  const config = await AppConfig.findOne({
    where: { key: 'max_favorites_limit' },
    attributes: ['value']
  });

  const parsed = config ? parseInt(config.value, 10) : 5;
  cachedLimit = Number.isNaN(parsed) ? 5 : parsed;
  cachedAt = now;
  return cachedLimit;
}

function invalidateAppConfigCache() {
  cachedLimit = null;
  cachedAt = 0;
}

module.exports = {
  getMaxFavoritesLimit,
  invalidateAppConfigCache
};
