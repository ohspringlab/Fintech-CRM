require('dotenv').config();
const { createClerkClient } = require('@clerk/backend');
const { pool } = require('./config');

async function resetClerkPassword() {
  try {
    console.log('🔐 Reset Clerk Password\n');
    
    // Check if Clerk is configured
    if (!process.env.CLERK_SECRET_KEY) {
      console.error('❌ CLERK_SECRET_KEY not configured in .env');
      process.exit(1);
    }
    
    // Initialize Clerk client
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY
    });
    
    // Get email and password from command line
    const email = process.argv[2];
    const newPassword = process.argv[3];
    
    if (!email) {
      console.error('❌ Usage: node reset-clerk-password.js <email> <new-password>');
      console.error('   Example: node reset-clerk-password.js user@example.com MyNewPass123');
      process.exit(1);
    }
    
    if (!newPassword || newPassword.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      console.error('   Usage: node reset-clerk-password.js <email> <new-password>');
      process.exit(1);
    }
    
    // Check if user exists in database
    const userCheck = await pool.query(
      'SELECT id, email, full_name FROM users WHERE LOWER(TRIM(email)) = $1',
      [email.toLowerCase().trim()]
    );
    
    if (userCheck.rows.length === 0) {
      console.error(`❌ User not found in database: ${email}`);
      console.error('💡 The user must exist in the database first.');
      process.exit(1);
    }
    
    const user = userCheck.rows[0];
    console.log('User found in database:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.full_name || 'N/A'}`);
    console.log(`  ID: ${user.id}\n`);
    
    // Find user in Clerk by email
    console.log('🔍 Searching for user in Clerk...');
    const clerkUsers = await clerkClient.users.getUserList({
      emailAddress: [email.toLowerCase().trim()]
    });
    
    if (clerkUsers.data.length === 0) {
      console.error(`❌ User not found in Clerk: ${email}`);
      console.error('💡 The user must sign up through Clerk first, or you need to create them in Clerk.');
      process.exit(1);
    }
    
    const clerkUser = clerkUsers.data[0];
    console.log('✅ User found in Clerk:');
    console.log(`  Clerk ID: ${clerkUser.id}`);
    console.log(`  Email: ${clerkUser.primaryEmailAddress?.emailAddress}`);
    console.log(`  Created: ${clerkUser.createdAt}\n`);
    
    // Update password in Clerk
    console.log('🔄 Updating password in Clerk...');
    try {
      await clerkClient.users.updateUser(clerkUser.id, {
        password: newPassword,
        skipPasswordChecks: false
      });
      
      console.log('\n✅ Password reset successfully in Clerk!');
      console.log(`\nLogin credentials:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${newPassword}\n`);
      console.log('💡 You can now log in using these credentials.\n');
    } catch (clerkError) {
      console.error('❌ Failed to update password in Clerk:', clerkError.message);
      if (clerkError.errors) {
        clerkError.errors.forEach(err => {
          console.error(`   - ${err.message}`);
        });
      }
      process.exit(1);
    }
    
    // Also update password in database (for consistency, though it's not used for Clerk auth)
    console.log('💾 Also updating password in database (for consistency)...');
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, user.id]
    );
    console.log('✅ Database password also updated.\n');
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to reset password:', error.message);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.message}`);
      });
    }
    process.exit(1);
  }
}

resetClerkPassword();


