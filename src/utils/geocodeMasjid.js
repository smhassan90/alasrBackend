const logger = require('./logger');

function parseCoord(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function buildQuery(masjid) {
  const parts = [
    masjid.name,
    masjid.address,
    masjid.area,
    masjid.location,
    masjid.city,
    masjid.state,
    masjid.postal_code,
    masjid.country || 'Pakistan',
  ].filter(Boolean);
  return [...new Set(parts)].join(', ');
}

function scoreNominatimResult(item) {
  const cls = String(item.class || '').toLowerCase();
  const typ = String(item.type || '').toLowerCase();
  if (typ.includes('mosque') || typ.includes('place_of_worship')) {
    return 100;
  }
  if (cls === 'amenity' || cls === 'building' || cls === 'tourism') {
    return 70;
  }
  if (cls === 'boundary') {
    return 0;
  }
  if (
    cls === 'place' &&
    ['city', 'town', 'state', 'country', 'county', 'municipality', 'village'].includes(typ)
  ) {
    return 0;
  }
  return 20;
}

function pickBestResult(data) {
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }
  const ranked = data
    .map(item => ({item, score: scoreNominatimResult(item)}))
    .sort((a, b) => b.score - a.score);
  const best = ranked.find(entry => entry.score > 0) || ranked[0];
  const latitude = parseCoord(best?.item?.lat);
  const longitude = parseCoord(best?.item?.lon);
  if (latitude === null || longitude === null) {
    return null;
  }
  return {latitude, longitude, score: best.score};
}

async function searchNominatim(query) {
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&countrycodes=pk&q=' +
    encodeURIComponent(query);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AlAsrPrayerTimes/1.0 (alasrbackend.vercel.app)',
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function geocodeMasjid(masjid) {
  const existingLat = parseCoord(masjid.latitude);
  const existingLon = parseCoord(masjid.longitude);
  const hasExisting =
    existingLat !== null &&
    existingLon !== null &&
    Math.abs(existingLat) <= 90 &&
    Math.abs(existingLon) <= 180;

  const query = buildQuery(masjid);
  if (!query) {
    return hasExisting ? {latitude: existingLat, longitude: existingLon} : null;
  }

  try {
    const best = pickBestResult(await searchNominatim(query));
    if (best && best.score >= 70) {
      return {latitude: best.latitude, longitude: best.longitude};
    }
    if (hasExisting) {
      return {latitude: existingLat, longitude: existingLon};
    }
    if (best) {
      return {latitude: best.latitude, longitude: best.longitude};
    }
    return null;
  } catch (error) {
    logger.warn(`Geocode failed for masjid ${masjid.id || masjid.name}: ${error.message}`);
    return hasExisting ? {latitude: existingLat, longitude: existingLon} : null;
  }
}

async function persistMasjidCoordinates(masjid) {
  const coords = await geocodeMasjid(masjid);
  if (!coords || !masjid?.id || typeof masjid.update !== 'function') {
    return coords;
  }
  try {
    const currentLat = parseCoord(masjid.latitude);
    const currentLon = parseCoord(masjid.longitude);
    if (currentLat !== coords.latitude || currentLon !== coords.longitude) {
      await masjid.update({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    }
  } catch (error) {
    logger.warn(`Failed to save coordinates for masjid ${masjid.id}: ${error.message}`);
  }
  return coords;
}

module.exports = {geocodeMasjid, persistMasjidCoordinates};
