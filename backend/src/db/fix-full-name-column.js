require('dotenv').config();
const { pool } = require('./config');

async function fixFullNameColumn() {
  try {
    console.log('🔧 Fixing full_name column in users table...\n');
    
    // Check if column exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'full_name'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('➕ Adding full_name column...');
      
      // Add column (allow NULL initially)
      await pool.query(`ALTER TABLE users ADD COLUMN full_name VARCHAR(255)`);
      
      // Populate with email or default value
      await pool.query(`
        UPDATE users 
        SET full_name = COALESCE(email, 'User')
        WHERE full_name IS NULL
      `);
      
      // Try to set NOT NULL (might fail if there are still NULLs)
      try {
        await pool.query(`ALTER TABLE users ALTER COLUMN full_name SET NOT NULL`);
        console.log('✅ Set full_name to NOT NULL');
      } catch (notNullError) {
        console.log('⚠️  Could not set full_name to NOT NULL (some rows may be NULL)');
      }
      
      console.log('✅ Added and populated full_name column');
    } else {
      console.log('✅ full_name column already exists');
      
      // Check for NULL values and fix them
      const nullCheck = await pool.query(`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE full_name IS NULL
      `);
      
      if (parseInt(nullCheck.rows[0].count) > 0) {
        console.log(`⚠️  Found ${nullCheck.rows[0].count} rows with NULL full_name, fixing...`);
        await pool.query(`
          UPDATE users 
          SET full_name = COALESCE(email, 'User')
          WHERE full_name IS NULL
        `);
        console.log('✅ Fixed NULL full_name values');
      }
    }
    
    console.log('\n✅ Database schema fix complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix schema:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixFullNameColumn();

