const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserSettings = sequelize.define('UserSettings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    prayer_times_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    events_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    donations_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    general_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    questions_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'user_settings',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id']
      }
    ]
  });

  UserSettings.associate = (models) => {
    // UserSettings belongs to User
    UserSettings.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
  };

  return UserSettings;
};

