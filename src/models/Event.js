const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Event = sequelize.define('Event', {
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 255]
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    event_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    event_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: true
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
    tableName: 'events',
    timestamps: true,
    indexes: [
      {
        fields: ['masjid_id']
      },
      {
        fields: ['event_date']
      }
    ]
  });

  Event.associate = (models) => {
    // Event belongs to Masjid
    Event.belongsTo(models.Masjid, {
      foreignKey: 'masjid_id',
      as: 'masjid'
    });

    // Event was created by User
    Event.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return Event;
};

