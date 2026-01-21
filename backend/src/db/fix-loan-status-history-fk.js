require('dotenv').config();
const { pool } = require('./config');

async function fixLoanStatusHistoryFK() {
  try {
    console.log('Fixing loan_status_history foreign key constraints...');
    
    // Check current constraint
    const constraints = await pool.query(`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.table_name = 'loan_status_history' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'changed_by'
    `);
    
    console.log('Current constraints:', JSON.stringify(constraints.rows, null, 2));
    
    // Drop existing constraint if it exists
    if (constraints.rows.length > 0) {
      const constraintName = constraints.rows[0].constraint_name;
      console.log(`Dropping existing constraint: ${constraintName}`);
      await pool.query(`
        ALTER TABLE loan_status_history 
        DROP CONSTRAINT IF EXISTS ${constraintName}
      `);
    }
    
    // Recreate with ON DELETE SET NULL (preserve history even if user is deleted)
    console.log('Creating new constraint with ON DELETE SET NULL...');
    await pool.query(`
      ALTER TABLE loan_status_history
      ADD CONSTRAINT loan_status_history_changed_by_fkey
      FOREIGN KEY (changed_by)
      REFERENCES users(id)
      ON DELETE SET NULL
    `);
    
    console.log('✅ Successfully updated loan_status_history.changed_by foreign key constraint');
    console.log('   └─ Now: ON DELETE SET NULL (history preserved, user reference set to NULL)');
    
    // Also check and fix loan_id constraint if needed
    const loanIdConstraints = await pool.query(`
      SELECT 
        tc.constraint_name, 
        rc.delete_rule
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
        AND rc.constraint_schema = tc.table_schema
      WHERE tc.table_name = 'loan_status_history' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND EXISTS (
          SELECT 1 FROM information_schema.key_column_usage 
          WHERE constraint_name = tc.constraint_name 
          AND column_name = 'loan_id'
        )
    `);
    
    if (loanIdConstraints.rows.length > 0) {
      const loanIdConstraint = loanIdConstraints.rows[0];
      if (loanIdConstraint.delete_rule !== 'CASCADE') {
        console.log(`Updating loan_id constraint to CASCADE...`);
        await pool.query(`
          ALTER TABLE loan_status_history 
          DROP CONSTRAINT IF EXISTS ${loanIdConstraint.constraint_name}
        `);
        await pool.query(`
          ALTER TABLE loan_status_history
          ADD CONSTRAINT loan_status_history_loan_id_fkey
          FOREIGN KEY (loan_id)
          REFERENCES loan_requests(id)
          ON DELETE CASCADE
        `);
        console.log('✅ Updated loan_id constraint to ON DELETE CASCADE');
      } else {
        console.log('✅ loan_id constraint already has CASCADE');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix foreign key constraints:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixLoanStatusHistoryFK();


