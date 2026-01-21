require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./config');

async function resetUserPassword() {
  try {
    console.log('🔐 Reset User Password\n');
    
    // Get email and password from command line
    const email = process.argv[2];
    const newPassword = process.argv[3];
    
    if (!email) {
      console.error('❌ Usage: node reset-user-password.js <email> <new-password>');
      console.error('   Example: node reset-user-password.js user@example.com MyNewPass123');
      process.exit(1);
    }
    
    if (!newPassword || newPassword.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      console.error('   Usage: node reset-user-password.js <email> <new-password>');
      process.exit(1);
    }
    
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id, email, full_name FROM users WHERE LOWER(TRIM(email)) = $1',
      [email.toLowerCase().trim()]
    );
    
    if (userCheck.rows.length === 0) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }
    
    const user = userCheck.rows[0];
    console.log(`User found:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.full_name || 'N/A'}`);
    console.log(`  ID: ${user.id}\n`);
    
    // Hash password
    console.log('🔄 Hashing password...');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    // Update password
    console.log('💾 Updating password in database...');
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, user.id]
    );
    
    console.log('\n✅ Password reset successfully!');
    console.log(`\nLogin credentials:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${newPassword}\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to reset password:', error.message);
    process.exit(1);
  }
}

resetUserPassword();

