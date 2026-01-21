require('dotenv').config();
const { pool } = require('./config');

async function fixUserRoles() {
  try {
    console.log('🔧 Fixing user roles...\n');
    
    // Update 'client' role to 'borrower'
    const result = await pool.query(`
      UPDATE users 
      SET role = 'borrower', updated_at = NOW()
      WHERE role = 'client'
      RETURNING email, role
    `);
    
    if (result.rows.length > 0) {
      console.log(`✅ Updated ${result.rows.length} user(s) from 'client' to 'borrower':`);
      result.rows.forEach(row => {
        console.log(`   - ${row.email}`);
      });
    } else {
      console.log('✅ No users with "client" role found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixUserRoles();

