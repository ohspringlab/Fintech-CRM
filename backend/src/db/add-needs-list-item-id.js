require('dotenv').config();
const { pool } = require('./config');

async function addNeedsListItemIdColumn() {
  try {
    console.log('Checking and adding needs_list_item_id column to documents table...');
    
    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name = 'needs_list_item_id'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ needs_list_item_id column already exists');
      process.exit(0);
      return;
    }
    
    // Check the id type used in needs_list_items table
    const idTypeResult = await pool.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'needs_list_items' AND column_name = 'id'
    `);
    const idType = idTypeResult.rows[0]?.data_type === 'uuid' ? 'UUID' : 'VARCHAR(255)';
    
    // Add the column
    console.log('Adding needs_list_item_id column...');
    await pool.query(`
      ALTER TABLE documents ADD COLUMN needs_list_item_id ${idType} REFERENCES needs_list_items(id)
    `);
    
    console.log('✅ Successfully added needs_list_item_id column to documents table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add needs_list_item_id column:', error.message);
    process.exit(1);
  }
}

addNeedsListItemIdColumn();


