/**
 * Script to fix double-hashed password for a user
 * Run: node fix-user-password.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize } = require('./src/models');
const { User } = require('./src/models');

async function fixUserPassword(email, newPassword) {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Find user
    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    
    if (!user) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log(`\n📋 User found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current password hash: ${user.password ? user.password.substring(0, 30) + '...' : 'NULL'}`);

    // Hash the new password (will be hashed once by the model hook)
    // But since we're updating directly, we need to hash it manually
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password directly in database (bypassing model hooks)
    await sequelize.query(
      `UPDATE users SET password = :password WHERE id = :userId`,
      {
        replacements: { password: hashedPassword, userId: user.id },
        type: sequelize.QueryTypes.UPDATE
      }
    );

    console.log(`\n✅ Password updated successfully!`);
    console.log(`   New password: ${newPassword}`);
    console.log(`   New hash: ${hashedPassword.substring(0, 30)}...`);
    console.log(`\n🧪 You can now test login with:`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Password: ${newPassword}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

// Get email and password from command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log('Usage: node fix-user-password.js <email> <new-password>');
  console.log('Example: node fix-user-password.js taha@alasr.com Password123');
  process.exit(1);
}

fixUserPassword(email, password);

