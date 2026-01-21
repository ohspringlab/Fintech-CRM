require('dotenv').config();
const { pool } = require('./config');

async function fixAllUserFKConstraints() {
  try {
    console.log('Fixing all user-related foreign key constraints...\n');
    
    // Get all foreign key constraints that reference users(id)
    const allConstraints = await pool.query(`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name,
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
      WHERE ccu.table_name = 'users' 
        AND ccu.column_name = 'id'
        AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `);
    
    console.log(`Found ${allConstraints.rows.length} foreign key constraints referencing users(id):\n`);
    
    // Define which constraints should use SET NULL vs CASCADE
    // SET NULL: For audit/history fields where we want to preserve records
    // CASCADE: For ownership relationships where child records should be deleted
    const setNullColumns = [
      'changed_by',      // loan_status_history - preserve history
      'requested_by',    // needs_list_items - preserve document requests
      'reviewed_by',     // needs_list_items - preserve review history
      'completed_by',    // closing_checklist_items - preserve completion history
      'created_by',      // closing_checklist_items - preserve creation history
      'user_id'          // audit_logs - preserve audit trail
    ];
    
    const cascadeColumns = [
      'user_id'          // For ownership relationships (crm_profiles, loan_requests, notifications)
    ];
    
    for (const constraint of allConstraints.rows) {
      const { constraint_name, table_name, column_name, delete_rule } = constraint;
      console.log(`  ${table_name}.${column_name}: ${delete_rule}`);
      
      // Determine the desired delete rule
      let desiredRule = 'NO ACTION'; // default
      if (setNullColumns.includes(column_name)) {
        desiredRule = 'SET NULL';
      } else if (cascadeColumns.includes(column_name) && 
                 (table_name === 'crm_profiles' || 
                  table_name === 'loan_requests' || 
                  table_name === 'notifications')) {
        desiredRule = 'CASCADE';
      } else if (column_name === 'user_id' && 
                 (table_name === 'audit_logs' || 
                  table_name === 'documents' || 
                  table_name === 'payments' || 
                  table_name === 'email_queue')) {
        // For these, SET NULL is better to preserve records
        desiredRule = 'SET NULL';
      }
      
      // Skip if already correct
      if (delete_rule === desiredRule) {
        console.log(`    ✅ Already ${desiredRule} - skipping\n`);
        continue;
      }
      
      // Update the constraint
      console.log(`    🔄 Changing from ${delete_rule} to ${desiredRule}...`);
      
      try {
        // Drop existing constraint
        await pool.query(`
          ALTER TABLE ${table_name} 
          DROP CONSTRAINT IF EXISTS ${constraint_name}
        `);
        
        // Recreate with new delete rule
        await pool.query(`
          ALTER TABLE ${table_name}
          ADD CONSTRAINT ${constraint_name}
          FOREIGN KEY (${column_name})
          REFERENCES users(id)
          ON DELETE ${desiredRule}
        `);
        
        console.log(`    ✅ Updated to ${desiredRule}\n`);
      } catch (error) {
        console.error(`    ❌ Failed to update: ${error.message}\n`);
      }
    }
    
    console.log('✅ All foreign key constraints updated!');
    console.log('\nSummary:');
    console.log('  - SET NULL: Preserves records, sets user reference to NULL');
    console.log('  - CASCADE: Deletes child records when user is deleted');
    console.log('  - NO ACTION: Prevents deletion (not recommended for user references)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix foreign key constraints:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAllUserFKConstraints();


