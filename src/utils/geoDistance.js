function parseCoord(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

function isValidCoordinate(lat, lon) {
  return (
    lat !== null &&
    lon !== null &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180 &&
    !(lat === 0 && lon === 0)
  );
}

function haversineKm(lat1, lon1, lat2, lon2) {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) {
    return null;
  }
  const R = 6371.0088;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseLatLng(latRaw, lngRaw) {
  const lat = parseCoord(latRaw);
  const lng = parseCoord(lngRaw);
  if (!isValidCoordinate(lat, lng)) {
    return null;
  }
  return { lat, lng };
}

function attachDistanceKm(masjidData, origin) {
  if (!origin) {
    return masjidData;
  }
  const lat = parseCoord(masjidData.latitude);
  const lng = parseCoord(masjidData.longitude);
  const distanceKm = haversineKm(origin.lat, origin.lng, lat, lng);
  if (distanceKm !== null) {
    masjidData.distanceKm = Math.round(distanceKm * 1000) / 1000;
  }
  return masjidData;
}

function sortByDistanceKm(a, b) {
  const aDist = Number.isFinite(a.distanceKm) ? a.distanceKm : Number.POSITIVE_INFINITY;
  const bDist = Number.isFinite(b.distanceKm) ? b.distanceKm : Number.POSITIVE_INFINITY;
  return aDist - bDist;
}

module.exports = {
  parseCoord,
  isValidCoordinate,
  haversineKm,
  parseLatLng,
  attachDistanceKm,
  sortByDistanceKm,
};
