'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [fks] = await queryInterface.sequelize.query(`
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

    for (const fk of fks || []) {
      const name = fk.CONSTRAINT_NAME || fk.constraintName;
      const rule = fk.DELETE_RULE || fk.deleteRule;
      if (name && rule !== 'SET NULL') {
        await queryInterface.sequelize.query(`ALTER TABLE masajids DROP FOREIGN KEY \`${name}\``);
      }
    }

    await queryInterface.changeColumn('masajids', 'created_by', {
      type: Sequelize.UUID,
      allowNull: true
    });

    const [remaining] = await queryInterface.sequelize.query(`
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

    const hasSetNull = (remaining || []).some((fk) => (fk.DELETE_RULE || fk.deleteRule) === 'SET NULL');
    if (!hasSetNull) {
      await queryInterface.sequelize.query(`
        ALTER TABLE masajids
        ADD CONSTRAINT masajids_created_by_fk
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    const [fks] = await queryInterface.sequelize.query(`
      SELECT k.CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE k
      WHERE k.TABLE_SCHEMA = DATABASE()
        AND k.TABLE_NAME = 'masajids'
        AND k.COLUMN_NAME = 'created_by'
        AND k.REFERENCED_TABLE_NAME IS NOT NULL
    `);

    for (const fk of fks || []) {
      const name = fk.CONSTRAINT_NAME || fk.constraintName;
      if (name) {
        await queryInterface.sequelize.query(`ALTER TABLE masajids DROP FOREIGN KEY \`${name}\``);
      }
    }

    await queryInterface.changeColumn('masajids', 'created_by', {
      type: Sequelize.UUID,
      allowNull: false
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE masajids
      ADD CONSTRAINT masajids_created_by_fk
      FOREIGN KEY (created_by) REFERENCES users(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
    `);
  }
};
