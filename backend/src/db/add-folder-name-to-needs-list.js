require('dotenv').config();
const { pool } = require('./config');

async function addFolderNameToNeedsList() {
  try {
    console.log('Checking and adding folder_name column to needs_list_items table...');
    
    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'needs_list_items' AND column_name = 'folder_name'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ folder_name column already exists');
      process.exit(0);
      return;
    }
    
    // Add the column
    console.log('Adding folder_name column...');
    await pool.query(`
      ALTER TABLE needs_list_items ADD COLUMN folder_name VARCHAR(100)
    `);
    
    // Update existing rows with a default folder name if they don't have one
    await pool.query(`
      UPDATE needs_list_items SET folder_name = 'uncategorized' WHERE folder_name IS NULL
    `);
    
    // Make it NOT NULL after setting defaults
    try {
      await pool.query(`
        ALTER TABLE needs_list_items ALTER COLUMN folder_name SET NOT NULL
      `);
    } catch (error) {
      console.warn('⚠️  Could not set folder_name to NOT NULL');
    }
    
    console.log('✅ Successfully added folder_name column to needs_list_items table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add folder_name column:', error.message);
    process.exit(1);
  }
}

addFolderNameToNeedsList();


