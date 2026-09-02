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

async function geocodeMasjid(masjid) {
  const existingLat = parseCoord(masjid.latitude);
  const existingLon = parseCoord(masjid.longitude);
  if (
    existingLat !== null &&
    existingLon !== null &&
    Math.abs(existingLat) <= 90 &&
    Math.abs(existingLon) <= 180
  ) {
    return { latitude: existingLat, longitude: existingLon };
  }

  const query = buildQuery(masjid);
  if (!query) {
    return null;
  }

  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&countrycodes=pk&q=' +
      encodeURIComponent(query);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AlAsrPrayerTimes/1.0 (alasrbackend.vercel.app)',
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (!Array.isArray(data) || !data[0]?.lat || !data[0]?.lon) {
      return null;
    }
    const latitude = parseCoord(data[0].lat);
    const longitude = parseCoord(data[0].lon);
    if (latitude === null || longitude === null) {
      return null;
    }
    return { latitude, longitude };
  } catch (error) {
    logger.warn(`Geocode failed for masjid ${masjid.id || masjid.name}: ${error.message}`);
    return null;
  }
}

async function persistMasjidCoordinates(masjid) {
  const coords = await geocodeMasjid(masjid);
  if (!coords || !masjid?.id || typeof masjid.update !== 'function') {
    return coords;
  }
  try {
    await masjid.update({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
  } catch (error) {
    logger.warn(`Failed to save coordinates for masjid ${masjid.id}: ${error.message}`);
  }
  return coords;
}

module.exports = { geocodeMasjid, persistMasjidCoordinates };
