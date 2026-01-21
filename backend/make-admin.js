require('dotenv').config();
const { query, pool, db } = require('./src/db/config');

// Update this with your Clerk email
const email = 'dtgamingyoutub@gmail.com';

(async () => {
  try {
    console.log(`\n🔧 Updating user ${email} to admin role...\n`);
    
    // Check if user exists
    const checkResult = await query(
      'SELECT id, email, full_name, role FROM users WHERE email = $1',
      [email]
    );
    
    if (checkResult.rows.length === 0) {
      console.log('❌ User not found!');
      console.log('💡 Login to the app first with Clerk, then run this script.\n');
      process.exit(1);
    }
    
    const user = checkResult.rows[0];
    console.log('Current user:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.full_name}`);
    console.log(`  Current Role: ${user.role}`);
    console.log('');
    
    // Update to admin
    await query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      ['admin', email]
    );
    
    // Verify update
    const verifyResult = await query(
      'SELECT id, email, full_name, role FROM users WHERE email = $1',
      [email]
    );
    
    const updatedUser = verifyResult.rows[0];
    console.log('✅ User updated successfully!');
    console.log(`  New Role: ${updatedUser.role}`);
    console.log('\n💡 Refresh your browser to see admin access.\n');
    
    // Close database connection properly
    if (db && typeof db.close === 'function') {
      db.close();
    } else if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (db && typeof db.close === 'function') {
      db.close();
    } else if (pool && typeof pool.end === 'function') {
      await pool.end();
    }
    process.exit(1);
  }
})();
