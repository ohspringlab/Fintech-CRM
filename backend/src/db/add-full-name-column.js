require('dotenv').config();
const { pool } = require('./config');

async function addMissingColumns() {
  try {
    console.log('Checking and adding missing columns to users table...');
    
    // Add full_name column if it doesn't exist
    const checkFullName = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'full_name'
    `);
    
    if (checkFullName.rows.length === 0) {
      console.log('Adding full_name column...');
      await pool.query(`ALTER TABLE users ADD COLUMN full_name VARCHAR(255)`);
      await pool.query(`UPDATE users SET full_name = COALESCE(email, 'Unknown User') WHERE full_name IS NULL`);
      try {
        await pool.query(`ALTER TABLE users ALTER COLUMN full_name SET NOT NULL`);
      } catch (error) {
        console.warn('⚠️  Could not set full_name to NOT NULL');
      }
      console.log('✅ Added full_name column');
    } else {
      console.log('✅ full_name column already exists');
    }
    
    // Add phone column if it doesn't exist
    const checkPhone = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone'
    `);
    
    if (checkPhone.rows.length === 0) {
      console.log('Adding phone column...');
      await pool.query(`ALTER TABLE users ADD COLUMN phone VARCHAR(20)`);
      await pool.query(`UPDATE users SET phone = '000-000-0000' WHERE phone IS NULL`);
      try {
        await pool.query(`ALTER TABLE users ALTER COLUMN phone SET NOT NULL`);
      } catch (error) {
        console.warn('⚠️  Could not set phone to NOT NULL');
      }
      console.log('✅ Added phone column');
    } else {
      console.log('✅ phone column already exists');
    }
    
    // Add is_active column if it doesn't exist
    const checkIsActive = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'is_active'
    `);
    
    if (checkIsActive.rows.length === 0) {
      console.log('Adding is_active column...');
      await pool.query(`ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true`);
      await pool.query(`UPDATE users SET is_active = true WHERE is_active IS NULL`);
      console.log('✅ Added is_active column');
    } else {
      console.log('✅ is_active column already exists');
    }
    
    console.log('✅ All required columns are present in users table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add columns:', error.message);
    process.exit(1);
  }
}

addMissingColumns();

