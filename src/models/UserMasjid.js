const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserMasjid = sequelize.define('UserMasjid', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    masjid_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'masajids',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.ENUM('imam', 'admin'),
      allowNull: false,
      validate: {
        isIn: [['imam', 'admin']]
      }
    },
    can_view_complaints: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_answer_complaints: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_view_questions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_answer_questions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_change_prayer_times: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_create_events: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    can_create_notifications: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_default: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    assigned_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    assigned_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'user_masajids',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'masjid_id', 'role'],
        name: 'unique_user_masjid_role'
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['masjid_id']
      },
      {
        fields: ['masjid_id', 'role']
      }
    ]
  });

  UserMasjid.associate = (models) => {
    // UserMasjid belongs to User
    UserMasjid.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // UserMasjid belongs to Masjid
    UserMasjid.belongsTo(models.Masjid, {
      foreignKey: 'masjid_id',
      as: 'masjid'
    });

    // UserMasjid was assigned by a User
    UserMasjid.belongsTo(models.User, {
      foreignKey: 'assigned_by',
      as: 'assigner'
    });
  };

  return UserMasjid;
};

