'use strict';

async function indexExists(queryInterface, tableName, indexName) {
  const [rows] = await queryInterface.sequelize.query(
    `SHOW INDEX FROM \`${tableName}\` WHERE Key_name = :indexName`,
    { replacements: { indexName } }
  );
  return rows.length > 0;
}

async function addIndexIfMissing(queryInterface, tableName, fields, options) {
  if (await indexExists(queryInterface, tableName, options.name)) {
    return;
  }
  await queryInterface.addIndex(tableName, fields, options);
}

module.exports = {
  up: async (queryInterface) => {
    await addIndexIfMissing(queryInterface, 'prayer_times', ['masjid_id', 'effective_date'], {
      name: 'idx_prayer_times_masjid_date'
    });

    await addIndexIfMissing(queryInterface, 'masjid_subscriptions', ['masjid_id', 'is_active'], {
      name: 'idx_masjid_subscriptions_masjid_active'
    });

    await addIndexIfMissing(queryInterface, 'questions', ['masjid_id', 'status', 'created_at'], {
      name: 'idx_questions_masjid_status_created'
    });

    await addIndexIfMissing(queryInterface, 'events', ['masjid_id', 'status', 'event_date'], {
      name: 'idx_events_masjid_status_date'
    });

    await addIndexIfMissing(queryInterface, 'masajids', ['is_active', 'created_at'], {
      name: 'idx_masajids_active_created'
    });

    await addIndexIfMissing(queryInterface, 'masajids', ['city'], {
      name: 'idx_masajids_city'
    });

    // Keep one row per (user, masjid) / (device, masjid) before unique indexes
    await queryInterface.sequelize.query(`
      DELETE f1 FROM user_favorites f1
      INNER JOIN user_favorites f2
        ON f1.masjid_id = f2.masjid_id
       AND f1.id > f2.id
       AND f1.user_id IS NOT NULL
       AND f1.user_id = f2.user_id
    `);

    await queryInterface.sequelize.query(`
      DELETE f1 FROM user_favorites f1
      INNER JOIN user_favorites f2
        ON f1.masjid_id = f2.masjid_id
       AND f1.id > f2.id
       AND f1.device_id IS NOT NULL
       AND f1.device_id = f2.device_id
    `);

    await addIndexIfMissing(queryInterface, 'user_favorites', ['user_id', 'masjid_id'], {
      name: 'uniq_user_favorites_user_masjid',
      unique: true
    });

    await addIndexIfMissing(queryInterface, 'user_favorites', ['device_id', 'masjid_id'], {
      name: 'uniq_user_favorites_device_masjid',
      unique: true
    });
  },

  down: async (queryInterface) => {
    const dropIfExists = async (tableName, indexName) => {
      if (await indexExists(queryInterface, tableName, indexName)) {
        await queryInterface.removeIndex(tableName, indexName);
      }
    };

    await dropIfExists('prayer_times', 'idx_prayer_times_masjid_date');
    await dropIfExists('masjid_subscriptions', 'idx_masjid_subscriptions_masjid_active');
    await dropIfExists('questions', 'idx_questions_masjid_status_created');
    await dropIfExists('events', 'idx_events_masjid_status_date');
    await dropIfExists('masajids', 'idx_masajids_active_created');
    await dropIfExists('masajids', 'idx_masajids_city');
    await dropIfExists('user_favorites', 'uniq_user_favorites_user_masjid');
    await dropIfExists('user_favorites', 'uniq_user_favorites_device_masjid');
  }
};
