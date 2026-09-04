const { sequelize, Sequelize } = require('../models');
const { ensureEventScheduleColumns } = require('./ensureEventScheduleColumns');

const VALID_PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha', 'Jummah'];

const PRAYER_ALIASES = {
  fajr: 'Fajr',
  fajar: 'Fajr',
  dhuhr: 'Dhuhr',
  zuhr: 'Dhuhr',
  zohar: 'Dhuhr',
  asr: 'Asr',
  asar: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  jummah: 'Jummah',
  jumma: 'Jummah',
  juma: 'Jummah',
};

function normalizePrayerName(name) {
  if (!name) {
    return null;
  }
  const key = String(name).trim().toLowerCase();
  if (PRAYER_ALIASES[key]) {
    return PRAYER_ALIASES[key];
  }
  const match = VALID_PRAYERS.find(p => p.toLowerCase() === key);
  return match || null;
}

function timeToMinutes(time) {
  if (time == null || time === '') {
    return null;
  }
  if (time instanceof Date && !Number.isNaN(time.getTime())) {
    return time.getUTCHours() * 60 + time.getUTCMinutes();
  }
  const match = String(time).match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function minutesToClock(totalMinutes) {
  if (totalMinutes == null || !Number.isFinite(totalMinutes)) {
    return null;
  }
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function clockToDisplay(time) {
  const minutes = timeToMinutes(time);
  if (minutes == null) {
    return '';
  }
  return minutesToClock(minutes);
}

async function loadPrayerTimeMap(masjidId, date) {
  const rows = await sequelize.query(
    `SELECT pt.prayer_name, pt.prayer_time
     FROM prayer_times AS pt
     INNER JOIN (
       SELECT prayer_name, MAX(effective_date) AS max_date
       FROM prayer_times
       WHERE masjid_id = :masjidId AND effective_date <= :today
       GROUP BY prayer_name
     ) AS latest
       ON latest.prayer_name = pt.prayer_name
      AND latest.max_date = pt.effective_date
     WHERE pt.masjid_id = :masjidId`,
    {
      replacements: { masjidId, today: date },
      type: Sequelize.QueryTypes.SELECT,
    },
  );

  const map = {};
  (rows || []).forEach(row => {
    const name = normalizePrayerName(row.prayer_name);
    const clock = clockToDisplay(row.prayer_time);
    if (name && clock) {
      map[name] = clock;
    }
  });
  return map;
}

function resolveEventClock(event, prayerMap = {}) {
  const data = typeof event?.toJSON === 'function' ? event.toJSON() : event || {};
  const mode = data.time_mode || 'fixed';

  if (mode === 'after_prayer') {
    const prayer = normalizePrayerName(data.after_prayer);
    const offset = Number.isFinite(Number(data.minutes_after))
      ? Math.max(0, parseInt(data.minutes_after, 10))
      : 0;
    const base = prayer ? prayerMap[prayer] : null;
    const baseMinutes = timeToMinutes(base);
    if (baseMinutes != null) {
      return minutesToClock(baseMinutes + offset);
    }
    return null;
  }

  return clockToDisplay(data.event_time || data.resolved_event_time);
}

function enrichEvent(event, prayerMap = {}) {
  const data = typeof event?.toJSON === 'function' ? event.toJSON() : { ...event };
  const resolved = resolveEventClock(data, prayerMap);
  data.resolved_event_time = resolved;
  if (resolved) {
    data.event_time = resolved;
  }
  data.time_mode = data.time_mode || 'fixed';
  if (data.time_mode === 'after_prayer') {
    data.minutes_after =
      data.minutes_after === null || data.minutes_after === undefined
        ? 0
        : parseInt(data.minutes_after, 10);
  }
  return data;
}

async function enrichEventsForMasjid(events, masjidId, date) {
  await ensureEventScheduleColumns(sequelize);
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }
  const needsPrayer = events.some(event => {
    const data = typeof event?.toJSON === 'function' ? event.toJSON() : event;
    return (data.time_mode || 'fixed') === 'after_prayer';
  });
  const prayerMap = needsPrayer ? await loadPrayerTimeMap(masjidId, date) : {};
  return events.map(event => enrichEvent(event, prayerMap));
}

module.exports = {
  VALID_PRAYERS,
  normalizePrayerName,
  timeToMinutes,
  minutesToClock,
  clockToDisplay,
  loadPrayerTimeMap,
  resolveEventClock,
  enrichEvent,
  enrichEventsForMasjid,
  ensureEventScheduleColumns,
};
