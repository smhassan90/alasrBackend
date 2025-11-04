const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
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
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    auth_provider: {
      type: DataTypes.ENUM('local', 'google', 'facebook'),
      defaultValue: 'local',
      allowNull: true
    },
    google_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    facebook_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
      validate: {
        len: [6, 255]
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    profile_picture: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    is_super_admin: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    reset_password_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    reset_password_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    email_verification_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['email']
      }
    ],
    hooks: {
      beforeCreate: async (user) => {
        // Only hash password if provided and auth_provider is local
        if (user.password && (!user.auth_provider || user.auth_provider === 'local')) {
          const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
          user.password = await bcrypt.hash(user.password, salt);
        }
        // Set default auth_provider if not set
        if (!user.auth_provider) {
          user.auth_provider = 'local';
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password') && user.password) {
          const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  /**
   * Instance method to compare password
   * @param {string} candidatePassword - Password to compare
   * @returns {Promise<boolean>}
   */
  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  /**
   * Instance method to get safe user object (without password)
   * @returns {Object}
   */
  User.prototype.toSafeObject = function() {
    const { password, reset_password_token, reset_password_expires, email_verification_token, ...safeUser } = this.toJSON();
    return safeUser;
  };

  User.associate = (models) => {
    // User can belong to many Masajids through UserMasajid
    User.belongsToMany(models.Masjid, {
      through: models.UserMasjid,
      foreignKey: 'user_id',
      as: 'masajids'
    });

    // User has many UserMasajid associations
    User.hasMany(models.UserMasjid, {
      foreignKey: 'user_id',
      as: 'userMasajids'
    });

    // User has one UserSettings
    User.hasOne(models.UserSettings, {
      foreignKey: 'user_id',
      as: 'settings'
    });

    // User created many Masajids
    User.hasMany(models.Masjid, {
      foreignKey: 'created_by',
      as: 'createdMasajids'
    });

    // User updated many PrayerTimes
    User.hasMany(models.PrayerTime, {
      foreignKey: 'updated_by',
      as: 'updatedPrayerTimes'
    });

    // User replied to many Questions
    User.hasMany(models.Question, {
      foreignKey: 'replied_by',
      as: 'repliedQuestions'
    });

    // User created many Notifications
    User.hasMany(models.Notification, {
      foreignKey: 'created_by',
      as: 'createdNotifications'
    });

    // User created many Events
    User.hasMany(models.Event, {
      foreignKey: 'created_by',
      as: 'createdEvents'
    });

    // User assigned many UserMasajid relationships
    User.hasMany(models.UserMasjid, {
      foreignKey: 'assigned_by',
      as: 'assignedUserMasajids'
    });
  };

  return User;
};

