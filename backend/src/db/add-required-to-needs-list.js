require('dotenv').config();
const { pool } = require('./config');

async function addRequiredToNeedsList() {
  try {
    console.log('Checking and adding required column to needs_list_items table...');
    
    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'needs_list_items' AND column_name = 'required'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ required column already exists');
      process.exit(0);
      return;
    }
    
    // Add the column
    console.log('Adding required column...');
    await pool.query(`
      ALTER TABLE needs_list_items ADD COLUMN required BOOLEAN DEFAULT true
    `);
    
    // Update existing rows to have required = true by default
    await pool.query(`
      UPDATE needs_list_items SET required = true WHERE required IS NULL
    `);
    
    console.log('✅ Successfully added required column to needs_list_items table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add required column:', error.message);
    process.exit(1);
  }
}

addRequiredToNeedsList();


