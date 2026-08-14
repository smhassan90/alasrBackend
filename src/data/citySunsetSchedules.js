/**
 * City Maghrib (sunset) schedules.
 * Maghrib is taken from the latest entry with date <= target date.
 * Add more cities by appending to CITY_SUNSET_SCHEDULES.
 */
const CITY_SUNSET_SCHEDULES = {
  Karachi: {
    timezone: 'Asia/Karachi',
    // Date, Sunset_Time (Maghrib)
    entries: [
      { date: '2026-01-01', sunsetTime: '17:55' },
      { date: '2026-01-15', sunsetTime: '18:05' },
      { date: '2026-02-01', sunsetTime: '18:18' },
      { date: '2026-02-15', sunsetTime: '18:28' },
      { date: '2026-03-01', sunsetTime: '18:37' },
      { date: '2026-03-15', sunsetTime: '18:45' },
      { date: '2026-04-01', sunsetTime: '18:52' },
      { date: '2026-04-15', sunsetTime: '18:59' },
      { date: '2026-05-01', sunsetTime: '19:07' },
      { date: '2026-05-15', sunsetTime: '19:13' },
      { date: '2026-06-01', sunsetTime: '19:18' },
      { date: '2026-06-15', sunsetTime: '19:21' },
      { date: '2026-07-01', sunsetTime: '19:21' },
      { date: '2026-07-15', sunsetTime: '19:19' },
      { date: '2026-08-01', sunsetTime: '19:15' },
      { date: '2026-08-15', sunsetTime: '19:07' },
      { date: '2026-09-01', sunsetTime: '18:53' },
      { date: '2026-09-15', sunsetTime: '18:39' },
      { date: '2026-10-01', sunsetTime: '18:23' },
      { date: '2026-10-15', sunsetTime: '18:10' },
      { date: '2026-11-01', sunsetTime: '17:57' },
      { date: '2026-11-15', sunsetTime: '17:49' },
      { date: '2026-12-01', sunsetTime: '17:46' },
      { date: '2026-12-15', sunsetTime: '17:48' },
      { date: '2026-12-31', sunsetTime: '17:54' }
    ]
  }
};

/**
 * Normalize city name for lookup (case-insensitive, trimmed).
 * @param {string} city
 * @returns {string|null}
 */
function normalizeCityName(city) {
  if (!city || typeof city !== 'string') return null;
  const trimmed = city.trim();
  if (!trimmed) return null;

  const match = Object.keys(CITY_SUNSET_SCHEDULES).find(
    key => key.toLowerCase() === trimmed.toLowerCase()
  );
  return match || null;
}

/**
 * @param {string} city
 * @returns {Object|null}
 */
function getCitySchedule(city) {
  const key = normalizeCityName(city);
  return key ? CITY_SUNSET_SCHEDULES[key] : null;
}

/**
 * @returns {string[]}
 */
function getScheduledCityNames() {
  return Object.keys(CITY_SUNSET_SCHEDULES);
}

module.exports = {
  CITY_SUNSET_SCHEDULES,
  normalizeCityName,
  getCitySchedule,
  getScheduledCityNames
};
