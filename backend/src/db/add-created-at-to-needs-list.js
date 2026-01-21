require('dotenv').config();
const { pool } = require('./config');

async function addCreatedAtToNeedsList() {
  try {
    console.log('Checking needs_list_items table for created_at column...');
    
    // Check if column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'needs_list_items' AND column_name = 'created_at'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ created_at column already exists in needs_list_items');
    } else {
      console.log('Adding created_at column to needs_list_items...');
      await pool.query(`
        ALTER TABLE needs_list_items 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Added created_at column');
    }

    // Check if updated_at exists
    const updatedAtCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'needs_list_items' AND column_name = 'updated_at'
    `);
    
    if (updatedAtCheck.rows.length > 0) {
      console.log('✅ updated_at column already exists in needs_list_items');
    } else {
      console.log('Adding updated_at column to needs_list_items...');
      await pool.query(`
        ALTER TABLE needs_list_items 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Added updated_at column');
    }
    
    // Update existing rows to have timestamps
    await pool.query(`
      UPDATE needs_list_items 
      SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
          updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
      WHERE created_at IS NULL OR updated_at IS NULL
    `);
    
    console.log('✅ All columns are present in needs_list_items table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add columns:', error.message);
    process.exit(1);
  }
}

addCreatedAtToNeedsList();


