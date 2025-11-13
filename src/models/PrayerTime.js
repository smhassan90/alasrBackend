const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PrayerTime = sequelize.define('PrayerTime', {
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
    prayer_name: {
      type: DataTypes.ENUM('Fajr', 'Dhuhr', 'Jummah', 'Asr', 'Maghrib', 'Isha'),
      allowNull: false,
      validate: {
        isIn: [['Fajr', 'Dhuhr', 'Jummah', 'Asr', 'Maghrib', 'Isha']]
      }
    },
    prayer_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    effective_date: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW,
      allowNull: false
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    notify_users: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
      comment: 'Whether to notify users when prayer time is updated'
    }
  }, {
    tableName: 'prayer_times',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['masjid_id', 'prayer_name', 'effective_date'],
        name: 'unique_masjid_prayer_date'
      },
      {
        fields: ['masjid_id']
      }
    ]
  });

  PrayerTime.associate = (models) => {
    // PrayerTime belongs to Masjid
    PrayerTime.belongsTo(models.Masjid, {
      foreignKey: 'masjid_id',
      as: 'masjid'
    });

    // PrayerTime was updated by User
    PrayerTime.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updater'
    });
  };

  return PrayerTime;
};

