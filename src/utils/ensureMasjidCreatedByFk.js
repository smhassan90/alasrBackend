const logger = require('./logger');

let ready = false;
let inFlight = null;

function constraintName(row) {
  return row.CONSTRAINT_NAME || row.constraintName;
}

function deleteRule(row) {
  return row.DELETE_RULE || row.deleteRule;
}

async function listCreatedByForeignKeys(sequelize) {
  const [rows] = await sequelize.query(`
    SELECT k.CONSTRAINT_NAME, r.DELETE_RULE
    FROM information_schema.KEY_COLUMN_USAGE k
    JOIN information_schema.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
     AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
     AND r.TABLE_NAME = k.TABLE_NAME
    WHERE k.TABLE_SCHEMA = DATABASE()
      AND k.TABLE_NAME = 'masajids'
      AND k.COLUMN_NAME = 'created_by'
      AND k.REFERENCED_TABLE_NAME IS NOT NULL
  `);
  return Array.isArray(rows) ? rows : [];
}

/**
 * Stop deleting a masjid when its creator user is deleted.
 * Membership is removed in application code; this FK is the safety net.
 */
async function ensureMasjidCreatedByFk(sequelize) {
  if (ready) {
    return;
  }
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const fks = await listCreatedByForeignKeys(sequelize);
      const needsDrop = fks.filter((fk) => deleteRule(fk) !== 'SET NULL');

      for (const fk of needsDrop) {
        const name = constraintName(fk);
        if (!name) {
          continue;
        }
        await sequelize.query(`ALTER TABLE masajids DROP FOREIGN KEY \`${name}\``);
        logger.info(`Dropped masajids.created_by foreign key ${name} (ON DELETE ${deleteRule(fk)})`);
      }

      await sequelize.query('ALTER TABLE masajids MODIFY created_by CHAR(36) NULL');

      const remaining = await listCreatedByForeignKeys(sequelize);
      const hasSetNull = remaining.some((fk) => deleteRule(fk) === 'SET NULL');
      if (!hasSetNull) {
        await sequelize.query(`
          ALTER TABLE masajids
          ADD CONSTRAINT masajids_created_by_fk
          FOREIGN KEY (created_by) REFERENCES users(id)
          ON UPDATE CASCADE
          ON DELETE SET NULL
        `);
        logger.info('Added masajids.created_by foreign key ON DELETE SET NULL');
      }

      ready = true;
    } catch (error) {
      logger.error(`Failed to update masajids.created_by foreign key: ${error.message}`);
      throw error;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

module.exports = { ensureMasjidCreatedByFk };
