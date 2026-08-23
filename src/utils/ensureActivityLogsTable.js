const logger = require('./logger');

let ready = false;
let inFlight = null;

async function tableExists(sequelize) {
  const [rows] = await sequelize.query("SHOW TABLES LIKE 'activity_logs'");
  return Array.isArray(rows) && rows.length > 0;
}

async function createActivityLogsTable(sequelize) {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id CHAR(36) NOT NULL,
      masjid_id CHAR(36) NOT NULL,
      user_id CHAR(36) NULL,
      action VARCHAR(50) NOT NULL,
      message VARCHAR(500) NOT NULL,
      metadata TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_activity_logs_masjid_created (masjid_id, created_at),
      INDEX idx_activity_logs_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function ensureActivityLogsTable(sequelize) {
  if (ready) {
    return;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      if (!(await tableExists(sequelize))) {
        try {
          await createActivityLogsTable(sequelize);
          logger.info('Created missing activity_logs table');
        } catch (error) {
          logger.error(`Failed to create activity_logs table: ${error.message}`);
          if (!(await tableExists(sequelize))) {
            throw error;
          }
        }
      }
      ready = true;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

module.exports = { ensureActivityLogsTable };
