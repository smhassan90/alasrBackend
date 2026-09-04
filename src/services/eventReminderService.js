const { Op } = require('sequelize');
const { Event, Masjid, MasjidSubscription, User, UserSettings, DeviceSettings, sequelize } = require('../models');
const logger = require('../utils/logger');
const pushNotificationService = require('../utils/pushNotificationService');
const { ensureEventLastNotifiedColumn } = require('../utils/ensureEventLastNotifiedColumn');
const {
  ensureEventScheduleColumns,
  loadPrayerTimeMap,
  resolveEventClock,
  timeToMinutes,
} = require('../utils/eventScheduleService');

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMEZONE = 'Asia/Karachi';
const MINUTES_BEFORE = 15;
const WINDOW_MINUTES = 6;

function karachiNow() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const get = type => parts.find(part => part.type === type)?.value;
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hourRaw = parseInt(get('hour'), 10);
  const hour = hourRaw === 24 ? 0 : hourRaw;

  return {
    dayOfWeek: weekdayMap[get('weekday')] ?? 0,
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: hour * 60 + parseInt(get('minute'), 10),
  };
}

function formatClock(time) {
  const minutes = timeToMinutes(time);
  if (minutes == null) {
    return '';
  }
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, '0')} ${period}`;
}

function isInReminderWindow(eventMinutes, nowMinutes) {
  if (eventMinutes == null) {
    return false;
  }
  const minutesUntil = eventMinutes - nowMinutes;
  return minutesUntil >= MINUTES_BEFORE - WINDOW_MINUTES && minutesUntil <= MINUTES_BEFORE + WINDOW_MINUTES;
}

async function sendEventReminders(masjid, event, resolvedClock) {
  const subscriptions = await MasjidSubscription.findAll({
    where: {
      masjid_id: masjid.id,
      is_active: true,
      fcm_token: { [Op.ne]: null },
    },
    attributes: ['id', 'masjid_id', 'user_id', 'device_id', 'fcm_token'],
    include: [
      {
        model: User,
        as: 'user',
        required: false,
        attributes: ['id'],
        include: [
          {
            model: UserSettings,
            as: 'settings',
            required: false,
            attributes: ['events_notifications'],
          },
        ],
      },
    ],
  });

  const anonymousDeviceIds = subscriptions
    .filter(sub => !sub.user_id && sub.device_id)
    .map(sub => sub.device_id);

  const deviceSettingsMap = {};
  if (anonymousDeviceIds.length > 0) {
    const deviceSettings = await DeviceSettings.findAll({
      where: { device_id: { [Op.in]: anonymousDeviceIds } },
    });
    deviceSettings.forEach(ds => {
      deviceSettingsMap[ds.device_id] = ds;
    });
  }

  const validSubscriptions = subscriptions.filter(sub => {
    if (sub.user_id) {
      const settings = sub.user?.settings;
      return !settings || settings.events_notifications !== false;
    }
    if (sub.device_id) {
      const deviceSettings = deviceSettingsMap[sub.device_id];
      return !deviceSettings || deviceSettings.events_notifications !== false;
    }
    return false;
  });

  const fcmTokens = validSubscriptions
    .map(sub => sub.fcm_token)
    .filter(token => token && token.trim() !== '');

  if (fcmTokens.length === 0) {
    return 0;
  }

  const clock = formatClock(resolvedClock);
  const when =
    event.event_type === 'recurring'
      ? `every ${DAY_NAMES[event.day_of_week] || 'week'} at ${clock}`
      : `today at ${clock}`;
  const title = `${event.name} starts in 15 minutes`;
  const body = `${masjid.name}: ${event.name} ${when}.`;

  await pushNotificationService.sendBatchPushNotifications(fcmTokens, title, body, {
    masjidId: String(masjid.id),
    masjidName: String(masjid.name),
    eventId: String(event.id),
    eventName: String(event.name),
    category: 'Events',
    type: 'event_reminder',
  });

  return fcmTokens.length;
}

async function notifyUpcomingEvents() {
  await ensureEventLastNotifiedColumn(sequelize);
  await ensureEventScheduleColumns(sequelize);
  const now = karachiNow();
  const summary = { checked: 0, notified: 0, skipped: 0, errors: [] };
  const prayerMapCache = new Map();

  const events = await Event.findAll({
    where: {
      status: 'active',
      [Op.or]: [
        { event_type: 'recurring', day_of_week: now.dayOfWeek },
        { event_type: 'one_time', event_date: now.date },
      ],
    },
    include: [
      {
        model: Masjid,
        as: 'masjid',
        required: true,
        attributes: ['id', 'name'],
      },
    ],
  });

  for (const event of events) {
    summary.checked += 1;
    const alreadySent =
      event.last_notified_on && String(event.last_notified_on).slice(0, 10) === now.date;
    if (alreadySent) {
      summary.skipped += 1;
      continue;
    }

    let prayerMap = {};
    if ((event.time_mode || 'fixed') === 'after_prayer') {
      if (!prayerMapCache.has(event.masjid_id)) {
        prayerMapCache.set(event.masjid_id, await loadPrayerTimeMap(event.masjid_id, now.date));
      }
      prayerMap = prayerMapCache.get(event.masjid_id) || {};
    }

    const resolvedClock = resolveEventClock(event, prayerMap);
    if (!resolvedClock || !isInReminderWindow(timeToMinutes(resolvedClock), now.minutes)) {
      summary.skipped += 1;
      continue;
    }

    try {
      const sent = await sendEventReminders(event.masjid, event, resolvedClock);
      event.last_notified_on = now.date;
      await event.save();
      summary.notified += 1;
      logger.info(`Event reminder sent for ${event.id} (${event.name}) to ${sent} subscribers`);
    } catch (error) {
      summary.errors.push({ eventId: event.id, error: error.message });
      logger.error(`Event reminder failed for ${event.id}: ${error.message}`);
    }
  }

  return summary;
}

module.exports = { notifyUpcomingEvents };
