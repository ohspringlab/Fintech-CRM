require('dotenv').config();
const { pool } = require('./config');

async function checkUserAuth() {
  try {
    console.log('🔍 Checking user authentication status...\n');
    
    // Check users
    const result = await pool.query(`
      SELECT 
        email, 
        CASE WHEN password_hash IS NULL THEN 'NULL' 
             WHEN password_hash = '' THEN 'EMPTY' 
             ELSE 'HAS_HASH' END as hash_status,
        is_active,
        role,
        email_verified IS NOT NULL as email_verified
      FROM users 
      ORDER BY email
    `);
    
    console.log('Users in database:');
    console.log('─'.repeat(80));
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.email}`);
      console.log(`   Password Hash: ${row.hash_status}`);
      console.log(`   Active: ${row.is_active}`);
      console.log(`   Role: ${row.role}`);
      console.log(`   Email Verified: ${row.email_verified}`);
      console.log('');
    });
    
    // Check for users without passwords
    const noPassword = result.rows.filter(r => r.hash_status === 'NULL' || r.hash_status === 'EMPTY');
    if (noPassword.length > 0) {
      console.log(`⚠️  Warning: ${noPassword.length} user(s) without password hash:`);
      noPassword.forEach(u => console.log(`   - ${u.email}`));
      console.log('\nThese users cannot log in with email/password.');
      console.log('They may have been created via Clerk or another method.');
    }
    
    // Check for role mismatches
    const wrongRole = result.rows.filter(r => r.role === 'client');
    if (wrongRole.length > 0) {
      console.log(`\n⚠️  Warning: ${wrongRole.length} user(s) with role 'client' (expected 'borrower'):`);
      wrongRole.forEach(u => console.log(`   - ${u.email}`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUserAuth();

