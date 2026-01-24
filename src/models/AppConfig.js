const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AppConfig = sequelize.define('AppConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'app_config',
    timestamps: true,
    updatedAt: 'updated_at',
    createdAt: false, // No created_at column
    indexes: [
      {
        unique: true,
        fields: ['key']
      }
    ]
  });

  AppConfig.associate = (models) => {
    // Config was updated by a User (optional)
    AppConfig.belongsTo(models.User, {
      foreignKey: 'updated_by',
      as: 'updater'
    });
  };

  return AppConfig;
};

