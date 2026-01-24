const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserFavorite = sequelize.define('UserFavorite', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
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
    masjid_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'masajids',
        key: 'id'
      }
    }
  }, {
    tableName: 'user_favorites',
    timestamps: true,
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['device_id']
      },
      {
        fields: ['masjid_id']
      }
    ]
  });

  UserFavorite.associate = (models) => {
    // Favorite belongs to User (optional, for authenticated users)
    UserFavorite.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // Favorite belongs to Masjid
    UserFavorite.belongsTo(models.Masjid, {
      foreignKey: 'masjid_id',
      as: 'masjid'
    });
  };

  return UserFavorite;
};

