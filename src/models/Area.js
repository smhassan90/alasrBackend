const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Area = sequelize.define('Area', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'areas',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['country', 'state', 'city', 'name'],
        name: 'uniq_areas_location_name'
      },
      {
        fields: ['country', 'state', 'city'],
        name: 'idx_areas_location'
      }
    ]
  });

  Area.associate = (models) => {
    Area.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
  };

  return Area;
};
