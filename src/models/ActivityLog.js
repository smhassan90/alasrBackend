const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    masjid_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'masajids',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    message: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('metadata');
        if (!raw) {
          return null;
        }
        if (typeof raw === 'object') {
          return raw;
        }
        try {
          return JSON.parse(raw);
        } catch (error) {
          return raw;
        }
      },
      set(value) {
        if (value == null) {
          this.setDataValue('metadata', null);
          return;
        }
        this.setDataValue(
          'metadata',
          typeof value === 'string' ? value : JSON.stringify(value)
        );
      }
    }
  }, {
    tableName: 'activity_logs',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['masjid_id', 'created_at'],
        name: 'idx_activity_logs_masjid_created'
      },
      {
        fields: ['created_at'],
        name: 'idx_activity_logs_created'
      }
    ]
  });

  ActivityLog.associate = (models) => {
    ActivityLog.belongsTo(models.Masjid, {
      foreignKey: 'masjid_id',
      as: 'masjid'
    });

    ActivityLog.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return ActivityLog;
};
