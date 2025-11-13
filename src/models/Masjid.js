const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Masjid = sequelize.define('Masjid', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 255]
      }
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    postal_code: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    contact_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'masajids',
    timestamps: true
  });

  Masjid.associate = (models) => {
    // Masjid belongs to many Users through UserMasajid
    Masjid.belongsToMany(models.User, {
      through: models.UserMasjid,
      foreignKey: 'masjid_id',
      as: 'users'
    });

    // Masjid has many UserMasajid associations
    Masjid.hasMany(models.UserMasjid, {
      foreignKey: 'masjid_id',
      as: 'userMasajids'
    });

    // Masjid was created by a User
    Masjid.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });

    // Masjid has many PrayerTimes
    Masjid.hasMany(models.PrayerTime, {
      foreignKey: 'masjid_id',
      as: 'prayerTimes'
    });

    // Masjid has many Questions
    Masjid.hasMany(models.Question, {
      foreignKey: 'masjid_id',
      as: 'questions'
    });

    // Masjid has many Notifications
    Masjid.hasMany(models.Notification, {
      foreignKey: 'masjid_id',
      as: 'notifications'
    });

    // Masjid has many Events
    Masjid.hasMany(models.Event, {
      foreignKey: 'masjid_id',
      as: 'events'
    });

    // Masjid has many Subscriptions
    Masjid.hasMany(models.MasjidSubscription, {
      foreignKey: 'masjid_id',
      as: 'subscriptions'
    });
  };

  return Masjid;
};

