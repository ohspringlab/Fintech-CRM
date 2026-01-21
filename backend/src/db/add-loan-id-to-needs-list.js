require('dotenv').config();
const { pool } = require('./config');

async function addLoanIdToNeedsList() {
  try {
    console.log('Checking and adding loan_id column to needs_list_items table...');
    
    // Check if column exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'needs_list_items' AND column_name = 'loan_id'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ loan_id column already exists');
      process.exit(0);
      return;
    }
    
    // Check the id type used in loan_requests table
    const loanIdTypeResult = await pool.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'loan_requests' AND column_name = 'id'
    `);
    const loanIdType = loanIdTypeResult.rows[0]?.data_type === 'uuid' ? 'UUID' : 'VARCHAR(255)';
    
    // Add the column
    console.log('Adding loan_id column...');
    await pool.query(`
      ALTER TABLE needs_list_items ADD COLUMN loan_id ${loanIdType} REFERENCES loan_requests(id) ON DELETE CASCADE
    `);
    
    // Update existing rows if any (set to null for now, or you could try to match them)
    // This is optional - if there are existing rows, you might want to handle them differently
    console.log('✅ Successfully added loan_id column to needs_list_items table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add loan_id column:', error.message);
    process.exit(1);
  }
}

addLoanIdToNeedsList();


