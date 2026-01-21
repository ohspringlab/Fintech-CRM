require('dotenv').config();
const { pool } = require('./config');

async function fixUsersSchema() {
  try {
    console.log('🔧 Fixing users table schema...\n');
    
    // Add full_name column if it doesn't exist
    const checkFullName = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'full_name'
    `);
    
    if (checkFullName.rows.length === 0) {
      console.log('➕ Adding full_name column...');
      await pool.query(`ALTER TABLE users ADD COLUMN full_name VARCHAR(255)`);
      
      // Populate full_name from first_name and last_name
      await pool.query(`
        UPDATE users 
        SET full_name = TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, ''))
        WHERE full_name IS NULL OR full_name = ''
      `);
      
      // Set default for any remaining NULL values
      await pool.query(`
        UPDATE users 
        SET full_name = COALESCE(email, 'Unknown User')
        WHERE full_name IS NULL OR full_name = ''
      `);
      
      console.log('✅ Added and populated full_name column');
    } else {
      console.log('✅ full_name column already exists');
    }
    
    // Add phone column if it doesn't exist (and cell_phone exists)
    const checkPhone = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'phone'
    `);
    
    const checkCellPhone = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'cell_phone'
    `);
    
    if (checkPhone.rows.length === 0) {
      console.log('➕ Adding phone column...');
      await pool.query(`ALTER TABLE users ADD COLUMN phone VARCHAR(20)`);
      
      // Populate phone from cell_phone if it exists
      if (checkCellPhone.rows.length > 0) {
        await pool.query(`
          UPDATE users 
          SET phone = cell_phone
          WHERE phone IS NULL AND cell_phone IS NOT NULL
        `);
        console.log('✅ Populated phone from cell_phone');
      }
      
      // Set default for any remaining NULL values
      await pool.query(`
        UPDATE users 
        SET phone = ''
        WHERE phone IS NULL
      `);
      
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
      console.log('➕ Adding is_active column...');
      await pool.query(`ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true`);
      await pool.query(`UPDATE users SET is_active = true WHERE is_active IS NULL`);
      console.log('✅ Added is_active column');
    } else {
      console.log('✅ is_active column already exists');
    }
    
    // Fix email_verified: if it's a timestamp, we'll keep it but add a computed check
    // The code should handle both boolean and timestamp
    const checkEmailVerified = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email_verified'
    `);
    
    if (checkEmailVerified.rows.length > 0) {
      const dataType = checkEmailVerified.rows[0].data_type;
      if (dataType.includes('timestamp')) {
        console.log('ℹ️  email_verified is a timestamp (this is fine, code will handle it)');
      } else {
        console.log('✅ email_verified is boolean');
      }
    }
    
    console.log('\n✅ Users table schema is now compatible!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix schema:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixUsersSchema();

