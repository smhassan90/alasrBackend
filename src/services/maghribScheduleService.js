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
 * Parse YYYY-MM-DD to UTC midnight Date for day-diff math.
 * @param {string} dateStr
 * @returns {Date}
 */
function parseDateOnly(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Whole days between two YYYY-MM-DD dates (end - start).
 * @param {string} startDate
 * @param {string} endDate
 * @returns {number}
 */
function daysBetween(startDate, endDate) {
  const ms = parseDateOnly(endDate) - parseDateOnly(startDate);
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

/**
 * Convert HH:MM to minutes from midnight.
 * @param {string} time
 * @returns {number|null}
 */
function timeToMinutes(time) {
  const hhmm = toHHMM(time);
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Convert minutes from midnight to HH:MM (rounded, clamped 00:00–23:59).
 * @param {number} totalMinutes
 * @returns {string}
 */
function minutesToHHMM(totalMinutes) {
  let mins = Math.round(totalMinutes);
  // Keep within a single day for Maghrib
  mins = ((mins % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Get Maghrib (sunset) for a city on a given date.
 * Linearly interpolates between the previous and next schedule anchors.
 * Exact anchor dates use the schedule time as-is.
 * @param {string} city
 * @param {string|Date} [date] - YYYY-MM-DD; defaults to city-local today
 * @returns {{ date: string, sunsetTime: string, city: string, timezone: string, scheduleFrom?: string, scheduleTo?: string, interpolated?: boolean }|null}
 */
function getMaghribForCity(city, date = null) {
  const schedule = getCitySchedule(city);
  if (!schedule || !schedule.entries?.length) {
    return null;
  }

  const canonicalCity = normalizeCityName(city);
  const targetDate = toDateOnly(date) || getDateInTimezone(schedule.timezone);
  const entries = schedule.entries;

  let prevIndex = -1;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].date <= targetDate) {
      prevIndex = i;
    } else {
      break;
    }
  }

  // Before first schedule row
  if (prevIndex < 0) {
    return null;
  }

  const prev = entries[prevIndex];
  const prevTime = toHHMM(prev.sunsetTime);

  // Exact anchor day — no interpolation
  if (prev.date === targetDate) {
    return {
      city: canonicalCity,
      timezone: schedule.timezone,
      date: targetDate,
      sunsetTime: prevTime,
      scheduleFrom: prev.date,
      scheduleTo: prev.date,
      interpolated: false
    };
  }

  // After last schedule row — hold last known time
  if (prevIndex >= entries.length - 1) {
    return {
      city: canonicalCity,
      timezone: schedule.timezone,
      date: targetDate,
      sunsetTime: prevTime,
      scheduleFrom: prev.date,
      scheduleTo: prev.date,
      interpolated: false
    };
  }

  const next = entries[prevIndex + 1];
  const nextTime = toHHMM(next.sunsetTime);
  const spanDays = daysBetween(prev.date, next.date);

  if (spanDays <= 0) {
    return {
      city: canonicalCity,
      timezone: schedule.timezone,
      date: targetDate,
      sunsetTime: prevTime,
      scheduleFrom: prev.date,
      scheduleTo: next.date,
      interpolated: false
    };
  }

  const elapsedDays = daysBetween(prev.date, targetDate);
  const prevMins = timeToMinutes(prevTime);
  const nextMins = timeToMinutes(nextTime);

  if (prevMins == null || nextMins == null) {
    return null;
  }

  // Linear interpolation: start + (elapsed/span) * (end - start)
  // Negative (end - start) when Maghrib is getting earlier (e.g. 19:15 → 19:07)
  const interpolatedMins = prevMins + (elapsedDays / spanDays) * (nextMins - prevMins);
  const sunsetTime = minutesToHHMM(interpolatedMins);

  return {
    city: canonicalCity,
    timezone: schedule.timezone,
    date: targetDate,
    sunsetTime,
    scheduleFrom: prev.date,
    scheduleTo: next.date,
    interpolated: true
  };
}

/**
 * Upsert Maghrib prayer time for one masjid from its city schedule.
 * Writes Maghrib for city-local "today" so it always wins over older imam-set Maghrib rows.
 * @param {Object} masjid - Masjid instance (needs id, city, created_by)
 * @param {string} [date] - optional YYYY-MM-DD override (city-local today if omitted)
 * @returns {Promise<{ updated: boolean, skipped: boolean, prayerTime?: Object, maghrib?: Object, reason?: string }>}
 */
async function syncMaghribForMasjid(masjid, date = null) {
  if (!masjid?.city) {
    return { updated: false, skipped: true, reason: 'no_city' };
  }

  const today = toDateOnly(date) || getTodayForCity(masjid.city);
  const maghrib = getMaghribForCity(masjid.city, today);
  if (!maghrib) {
    return { updated: false, skipped: true, reason: 'no_schedule' };
  }

  if (!masjid.created_by) {
    logger.warn(`Maghrib sync skipped for masjid ${masjid.id}: missing created_by (required for updated_by)`);
    return { updated: false, skipped: true, reason: 'no_created_by', maghrib };
  }

  // Use today as effective_date so this row is the latest for getTodaysPrayerTimes
  const effectiveDate = today;
  const timeValue = maghrib.sunsetTime;

  const existing = await PrayerTime.findOne({
    where: {
      masjid_id: masjid.id,
      prayer_name: 'Maghrib',
      effective_date: effectiveDate
    }
  });

  if (existing) {
    const current = toHHMM(existing.prayer_time);
    if (current === timeValue) {
      return { updated: false, skipped: false, prayerTime: existing, maghrib };
    }

    existing.prayer_time = timeValue;
    existing.updated_by = masjid.created_by;
    existing.notify_users = false;
    await existing.save();

    logger.info(`Auto-updated Maghrib for masjid ${masjid.id} (${masjid.city}) to ${timeValue} effective ${effectiveDate} (schedule ${maghrib.date})`);
    return { updated: true, skipped: false, prayerTime: existing, maghrib };
  }

  const created = await PrayerTime.create({
    masjid_id: masjid.id,
    prayer_name: 'Maghrib',
    prayer_time: timeValue,
    effective_date: effectiveDate,
    updated_by: masjid.created_by,
    notify_users: false
  });

  logger.info(`Auto-created Maghrib for masjid ${masjid.id} (${masjid.city}) as ${timeValue} effective ${effectiveDate} (schedule ${maghrib.date})`);
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

  const today = toDateOnly(date) || getTodayForCity(masjid.city);
  const maghrib = getMaghribForCity(masjid.city, today);
  if (!maghrib) return prayerTimes;

  const list = prayerTimes.map(pt => (typeof pt.toJSON === 'function' ? pt.toJSON() : { ...pt }));
  const autoMaghrib = {
    id: list.find(pt => pt.prayer_name === 'Maghrib')?.id || null,
    masjid_id: masjid.id,
    prayer_name: 'Maghrib',
    prayer_time: maghrib.sunsetTime,
    effective_date: today,
    updated_by: masjid.created_by || null,
    notify_users: false,
    auto_scheduled: true,
    schedule_city: maghrib.city,
    schedule_effective_from: maghrib.date
  };

  const idx = list.findIndex(pt => pt.prayer_name === 'Maghrib');
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      prayer_time: maghrib.sunsetTime,
      effective_date: today,
      auto_scheduled: true,
      schedule_city: maghrib.city,
      schedule_effective_from: maghrib.date
    };
  } else {
    list.push(autoMaghrib);
  }

  return list;
}

/**
 * Build a scheduled Maghrib row shaped like a PrayerTime record.
 * @param {Object} masjid
 * @param {string} date - YYYY-MM-DD
 * @param {Object} [base] - existing row to merge onto
 * @returns {Object|null}
 */
function buildMaghribRow(masjid, date, base = null) {
  const maghrib = getMaghribForCity(masjid.city, date);
  if (!maghrib) return null;

  const scheduleFields = {
    prayer_time: maghrib.sunsetTime,
    effective_date: date,
    auto_scheduled: true,
    schedule_city: maghrib.city,
    schedule_effective_from: maghrib.scheduleFrom || maghrib.date
  };

  if (base) {
    return { ...base, ...scheduleFields };
  }

  return {
    id: null,
    masjid_id: masjid.id,
    prayer_name: 'Maghrib',
    updated_by: masjid.created_by || null,
    updater: null,
    notify_users: false,
    ...scheduleFields
  };
}

/**
 * Apply scheduled Maghrib across a list that may span multiple effective dates.
 * Each existing Maghrib row is recalculated from its own effective_date, and
 * missing days inside an explicit range are filled in.
 *
 * @param {Object} masjid
 * @param {Array} prayerTimes
 * @param {Object} [options]
 * @param {string} [options.startDate] - YYYY-MM-DD
 * @param {string} [options.endDate] - YYYY-MM-DD
 * @param {number} [options.maxDays] - safety cap when filling a range
 * @returns {Array}
 */
function applyScheduledMaghribByDate(masjid, prayerTimes, options = {}) {
  if (!masjid?.city || !hasAutomatedMaghrib(masjid.city)) {
    return prayerTimes;
  }

  const { maxDays = 400 } = options;
  const startDate = toDateOnly(options.startDate);
  const endDate = toDateOnly(options.endDate);

  const list = prayerTimes.map(pt => (typeof pt.toJSON === 'function' ? pt.toJSON() : { ...pt }));

  // Recalculate every existing Maghrib row from its own effective date
  const covered = new Set();
  for (let i = 0; i < list.length; i++) {
    if (list[i].prayer_name !== 'Maghrib') continue;

    const rowDate = toDateOnly(list[i].effective_date);
    if (!rowDate) continue;

    const updated = buildMaghribRow(masjid, rowDate, list[i]);
    if (updated) {
      list[i] = updated;
      covered.add(rowDate);
    }
  }

  // Fill days in an explicit range that have no Maghrib row yet
  if (startDate && endDate && startDate <= endDate) {
    const span = daysBetween(startDate, endDate);
    if (span >= 0 && span <= maxDays) {
      for (let offset = 0; offset <= span; offset++) {
        const cursor = parseDateOnly(startDate);
        cursor.setUTCDate(cursor.getUTCDate() + offset);
        const date = cursor.toISOString().split('T')[0];

        if (covered.has(date)) continue;

        const row = buildMaghribRow(masjid, date);
        if (row) {
          list.push(row);
          covered.add(date);
        }
      }
    } else {
      logger.warn(`Maghrib range fill skipped for masjid ${masjid.id}: span ${span} days exceeds cap ${maxDays}`);
    }
  }

  // Preserve existing ordering contract: newest effective_date first
  list.sort((a, b) => String(b.effective_date).localeCompare(String(a.effective_date)));

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
  applyScheduledMaghribToPrayerTimes,
  applyScheduledMaghribByDate
};
