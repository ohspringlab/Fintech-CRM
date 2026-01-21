require('dotenv').config();
const { pool } = require('./src/db/config');

(async () => {
  try {
    console.log('=== Checking Users in Database ===\n');
    
    // Get all users
    const result = await pool.query(
      `SELECT id, email, full_name, role, email_verified, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No users found in database!\n');
    } else {
      console.log(`✅ Found ${result.rows.length} users:\n`);
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.full_name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Email Verified: ${user.email_verified}`);
        console.log(`   Created: ${user.created_at}`);
        console.log('');
      });
    }
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
