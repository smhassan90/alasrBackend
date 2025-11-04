const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Question = sequelize.define('Question', {
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
      comment: 'Unique device identifier for anonymous users (hashed deviceId:platform:appVersion)'
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    user_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    question: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    status: {
      type: DataTypes.ENUM('new', 'replied'),
      defaultValue: 'new',
      allowNull: false
    },
    reply: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    replied_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    replied_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'questions',
    timestamps: true,
    indexes: [
      {
        fields: ['masjid_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['device_id']
      }
    ]
  });

  Question.associate = (models) => {
    // Question belongs to Masjid
    Question.belongsTo(models.Masjid, {
      foreignKey: 'masjid_id',
      as: 'masjid'
    });

    // Question belongs to User (if submitted by authenticated user)
    Question.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });

    // Question was replied by User
    Question.belongsTo(models.User, {
      foreignKey: 'replied_by',
      as: 'replier'
    });
  };

  return Question;
};

