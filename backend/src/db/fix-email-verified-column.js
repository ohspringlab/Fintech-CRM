require('dotenv').config();
const { pool } = require('./config');

async function fixEmailVerifiedColumn() {
  try {
    console.log('Checking email_verified column type...');
    
    // Check current column type
    const columnInfo = await pool.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email_verified'
    `);
    
    if (columnInfo.rows.length === 0) {
      console.log('email_verified column does not exist. Adding it as BOOLEAN...');
      await pool.query(`
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false
      `);
      console.log('✅ Added email_verified column as BOOLEAN');
      process.exit(0);
      return;
    }
    
    const currentType = columnInfo.rows[0].data_type;
    console.log(`Current type: ${currentType}`);
    
    if (currentType === 'boolean') {
      console.log('✅ email_verified column is already BOOLEAN');
      process.exit(0);
      return;
    }
    
    if (currentType === 'timestamp without time zone' || currentType === 'timestamp') {
      console.log('Converting email_verified from TIMESTAMP to BOOLEAN...');
      
      // First, add a temporary boolean column
      await pool.query(`
        ALTER TABLE users ADD COLUMN email_verified_new BOOLEAN DEFAULT false
      `);
      
      // Convert: if timestamp is not null, set to true
      await pool.query(`
        UPDATE users SET email_verified_new = (email_verified IS NOT NULL)
      `);
      
      // Drop the old column
      await pool.query(`
        ALTER TABLE users DROP COLUMN email_verified
      `);
      
      // Rename the new column
      await pool.query(`
        ALTER TABLE users RENAME COLUMN email_verified_new TO email_verified
      `);
      
      console.log('✅ Successfully converted email_verified to BOOLEAN');
    } else {
      console.log(`⚠️  Unexpected column type: ${currentType}. Please check manually.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix email_verified column:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixEmailVerifiedColumn();


