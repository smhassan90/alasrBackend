const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MasjidSubscription = sequelize.define('MasjidSubscription', {
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
    device_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'For anonymous users without account'
    },
    fcm_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Firebase Cloud Messaging token for push notifications'
    },
    // email field exists in database but is not used (kept for backward compatibility)
    // category field is deprecated - category preferences are now stored in user_settings
    // This field is kept nullable for backward compatibility
    category: {
      type: DataTypes.ENUM('Prayer Times', 'Donations', 'Events', 'General'),
      allowNull: true,
      validate: {
        isIn: [['Prayer Times', 'Donations', 'Events', 'General']]
      }
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'masjid_subscriptions',
    timestamps: true,
    indexes: [
      {
        fields: ['masjid_id']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['device_id']
      },
      {
        fields: ['fcm_token']
      },
      {
        fields: ['category']
      },
      // Note: Unique constraints are enforced at application level
      // MySQL doesn't support partial unique indexes with WHERE clauses
    ]
  });

  MasjidSubscription.associate = (models) => {
    // Subscription belongs to Masjid
    MasjidSubscription.belongsTo(models.Masjid, {
      foreignKey: 'masjid_id',
      as: 'masjid'
    });

    // Subscription belongs to User (optional, for authenticated users)
    MasjidSubscription.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return MasjidSubscription;
};

