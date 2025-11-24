const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DeviceSettings = sequelize.define('DeviceSettings', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    device_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      comment: 'Device identifier for anonymous users'
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
    tableName: 'device_settings',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['device_id']
      }
    ]
  });

  return DeviceSettings;
};

