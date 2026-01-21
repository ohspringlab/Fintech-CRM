require('dotenv').config();
const { pool } = require('./config');

async function createClosingChecklistTable() {
  try {
    console.log('Creating closing_checklist_items table...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'closing_checklist_items'
      )
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('✅ closing_checklist_items table already exists');
      process.exit(0);
      return;
    }
    
    // Check the id type used in loan_requests table
    const idTypeResult = await pool.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'loan_requests' AND column_name = 'id'
    `);
    const idType = idTypeResult.rows[0]?.data_type === 'uuid' ? 'UUID' : 'VARCHAR(255)';
    const idDefault = idTypeResult.rows[0]?.data_type === 'uuid' 
      ? 'DEFAULT gen_random_uuid()' 
      : '';
    
    await pool.query(`
      CREATE TABLE closing_checklist_items (
        id ${idType} PRIMARY KEY ${idDefault},
        loan_id ${idType} REFERENCES loan_requests(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        required BOOLEAN DEFAULT true,
        completed BOOLEAN DEFAULT false,
        completed_by ${idType} REFERENCES users(id),
        completed_at TIMESTAMP,
        notes TEXT,
        created_by ${idType} REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_closing_checklist_loan ON closing_checklist_items(loan_id)
    `);
    
    console.log('✅ Successfully created closing_checklist_items table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create closing_checklist_items table:', error.message);
    process.exit(1);
  }
}

createClosingChecklistTable();


