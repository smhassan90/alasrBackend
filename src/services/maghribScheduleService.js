const { Op } = require('sequelize');
const { PrayerTime, Masjid } = require('../models');
const {
  getCitySchedule,
  normalizeCityName,
  getScheduledCityNames
} = require('../data/citySunsetSchedules');
const logger = require('../utils/logger');

/**
 * Today's date (YYYY-MM-DD) in a given IANA timezone.
 * @param {string} timeZone
 * @param {Date} [now]
 * @returns {string}
 */
function getDateInTimezone(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

/**
 * Local calendar date for a city (falls back to UTC date).
 * @param {string} city
 * @returns {string}
 */
function getTodayForCity(city) {
  const schedule = getCitySchedule(city);
  if (schedule?.timezone) {
    return getDateInTimezone(schedule.timezone);
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Normalize HH:MM or HH:MM:SS (or Date-like TIME values) to HH:MM.
 * @param {string|Date} time
 * @returns {string|null}
 */
function toHHMM(time) {
  if (time == null) return null;

  if (time instanceof Date && !Number.isNaN(time.getTime())) {
    const hours = String(time.getUTCHours()).padStart(2, '0');
    const minutes = String(time.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  const str = String(time).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

/**
 * Whether this city has an automated Maghrib schedule.
 * @param {string} city
 * @returns {boolean}
 */
function hasAutomatedMaghrib(city) {
  return !!getCitySchedule(city);
}

/**
 * Normalize a date value to YYYY-MM-DD.
 * @param {string|Date|null|undefined} date
 * @returns {string|null}
 */
function toDateOnly(date) {
  if (!date) return null;
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  const str = String(date).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.slice(0, 10);
  }
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

/**
 * Get Maghrib (sunset) schedule entry for a city on a given date.
 * Uses the latest schedule row with date <= targetDate.
 * @param {string} city
 * @param {string|Date} [date] - YYYY-MM-DD; defaults to city-local today
 * @returns {{ date: string, sunsetTime: string, city: string, timezone: string }|null}
 */
function getMaghribForCity(city, date = null) {
  const schedule = getCitySchedule(city);
  if (!schedule || !schedule.entries?.length) {
    return null;
  }

  const canonicalCity = normalizeCityName(city);
  const targetDate = toDateOnly(date) || getDateInTimezone(schedule.timezone);

  // Entries are chronological; pick latest date <= targetDate
  let selected = null;
  for (const entry of schedule.entries) {
    if (entry.date <= targetDate) {
      selected = entry;
    } else {
      break;
    }
  }

  if (!selected) {
    return null;
  }

  return {
    city: canonicalCity,
    timezone: schedule.timezone,
    date: selected.date,
    sunsetTime: toHHMM(selected.sunsetTime)
  };
}

/**
 * Upsert Maghrib prayer time for one masjid from its city schedule.
 * @param {Object} masjid - Masjid instance (needs id, city, created_by)
 * @param {string} [date] - optional YYYY-MM-DD override
 * @returns {Promise<{ updated: boolean, skipped: boolean, prayerTime?: Object, maghrib?: Object, reason?: string }>}
 */
async function syncMaghribForMasjid(masjid, date = null) {
  if (!masjid?.city) {
    return { updated: false, skipped: true, reason: 'no_city' };
  }

  const maghrib = getMaghribForCity(masjid.city, date);
  if (!maghrib) {
    return { updated: false, skipped: true, reason: 'no_schedule' };
  }

  const existing = await PrayerTime.findOne({
    where: {
      masjid_id: masjid.id,
      prayer_name: 'Maghrib',
      effective_date: maghrib.date
    }
  });

  const timeValue = maghrib.sunsetTime;

  if (existing) {
    const current = toHHMM(existing.prayer_time);
    if (current === timeValue) {
      return { updated: false, skipped: false, prayerTime: existing, maghrib };
    }

    existing.prayer_time = timeValue;
    existing.updated_by = masjid.created_by;
    existing.notify_users = false;
    await existing.save();

    logger.info(`Auto-updated Maghrib for masjid ${masjid.id} (${masjid.city}) to ${timeValue} effective ${maghrib.date}`);
    return { updated: true, skipped: false, prayerTime: existing, maghrib };
  }

  const created = await PrayerTime.create({
    masjid_id: masjid.id,
    prayer_name: 'Maghrib',
    prayer_time: timeValue,
    effective_date: maghrib.date,
    updated_by: masjid.created_by,
    notify_users: false
  });

  logger.info(`Auto-created Maghrib for masjid ${masjid.id} (${masjid.city}) as ${timeValue} effective ${maghrib.date}`);
  return { updated: true, skipped: false, prayerTime: created, maghrib };
}

/**
 * Sync Maghrib for all active masajids in cities that have schedules.
 * @returns {Promise<Object>}
 */
async function syncMaghribForAllScheduledCities() {
  const cities = getScheduledCityNames();
  const summary = {
    cities,
    processed: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    errors: []
  };

  if (cities.length === 0) {
    return summary;
  }

  const masajids = await Masjid.findAll({
    where: {
      is_active: true,
      city: { [Op.ne]: null }
    },
    attributes: ['id', 'name', 'city', 'created_by']
  });

  const scheduled = masajids.filter(m => hasAutomatedMaghrib(m.city));

  for (const masjid of scheduled) {
    summary.processed += 1;
    try {
      const result = await syncMaghribForMasjid(masjid);
      if (result.skipped) {
        summary.skipped += 1;
      } else if (result.updated) {
        summary.updated += 1;
      } else {
        summary.unchanged += 1;
      }
    } catch (error) {
      summary.errors.push({ masjidId: masjid.id, error: error.message });
      logger.error(`Failed Maghrib sync for masjid ${masjid.id}: ${error.message}`);
    }
  }

  logger.info(`Maghrib auto-sync complete: processed=${summary.processed}, updated=${summary.updated}, unchanged=${summary.unchanged}, skipped=${summary.skipped}, errors=${summary.errors.length}`);
  return summary;
}

/**
 * Apply scheduled Maghrib onto a list of prayer-time records/objects for display.
 * Mutates a copy-friendly array of plain objects.
 * @param {Object} masjid
 * @param {Array} prayerTimes
 * @param {string} [date]
 * @returns {Array}
 */
function applyScheduledMaghribToPrayerTimes(masjid, prayerTimes, date = null) {
  if (!masjid?.city) return prayerTimes;

  const maghrib = getMaghribForCity(masjid.city, date);
  if (!maghrib) return prayerTimes;

  const list = prayerTimes.map(pt => (typeof pt.toJSON === 'function' ? pt.toJSON() : { ...pt }));
  const autoMaghrib = {
    id: list.find(pt => pt.prayer_name === 'Maghrib')?.id || null,
    masjid_id: masjid.id,
    prayer_name: 'Maghrib',
    prayer_time: maghrib.sunsetTime,
    effective_date: maghrib.date,
    updated_by: masjid.created_by || null,
    notify_users: false,
    auto_scheduled: true,
    schedule_city: maghrib.city
  };

  const idx = list.findIndex(pt => pt.prayer_name === 'Maghrib');
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      prayer_time: maghrib.sunsetTime,
      effective_date: maghrib.date,
      auto_scheduled: true,
      schedule_city: maghrib.city
    };
  } else {
    list.push(autoMaghrib);
  }

  return list;
}

module.exports = {
  getDateInTimezone,
  getTodayForCity,
  toHHMM,
  hasAutomatedMaghrib,
  getMaghribForCity,
  syncMaghribForMasjid,
  syncMaghribForAllScheduledCities,
  applyScheduledMaghribToPrayerTimes
};
