require('dotenv').config();
const { pool } = require('./config');

async function fixAllBlockingConstraints() {
  try {
    console.log('Fixing ALL foreign key constraints that might block deletions...\n');
    
    // Get ALL foreign key constraints in the database
    const allConstraints = await pool.query(`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column,
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
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (ccu.table_name = 'users' OR ccu.table_name = 'loan_requests')
      ORDER BY ccu.table_name, tc.table_name, kcu.column_name
    `);
    
    console.log(`Found ${allConstraints.rows.length} foreign key constraints:\n`);
    
    let fixed = 0;
    
    for (const constraint of allConstraints.rows) {
      const { constraint_name, table_name, column_name, referenced_table, delete_rule } = constraint;
      
      // Skip if already properly configured
      if (delete_rule !== 'NO ACTION' && delete_rule !== 'RESTRICT') {
        continue;
      }
      
      console.log(`Fixing: ${table_name}.${column_name} → ${referenced_table}.id`);
      console.log(`  Current: ${delete_rule}`);
      
      // Determine appropriate delete rule
      let desiredRule = 'SET NULL';
      
      // For user references
      if (referenced_table === 'users') {
        if (table_name === 'crm_profiles' && column_name === 'user_id') {
          desiredRule = 'CASCADE'; // Delete profile with user
        } else if (table_name === 'email_verification_tokens' && column_name === 'user_id') {
          desiredRule = 'CASCADE'; // Delete tokens with user
        } else if (table_name === 'notifications' && column_name === 'user_id') {
          desiredRule = 'CASCADE'; // Delete notifications with user
        } else if (table_name === 'loan_requests' && column_name === 'user_id') {
          desiredRule = 'SET NULL'; // Keep loans, but remove user reference
        } else {
          desiredRule = 'SET NULL'; // Default: preserve records
        }
      }
      // For loan_requests references
      else if (referenced_table === 'loan_requests') {
        desiredRule = 'CASCADE'; // Delete related records with loan
      }
      
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
          REFERENCES ${referenced_table}(id)
          ON DELETE ${desiredRule}
        `);
        
        console.log(`  ✅ Updated to ON DELETE ${desiredRule}\n`);
        fixed++;
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}\n`);
      }
    }
    
    if (fixed > 0) {
      console.log(`\n✅ Fixed ${fixed} constraint(s)!`);
    } else {
      console.log(`\n✅ All constraints are properly configured!`);
    }
    
    // Final verification
    console.log('\nVerifying all constraints are fixed...');
    const remaining = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name,
        rc.delete_rule
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'users'
        AND (rc.delete_rule = 'NO ACTION' OR rc.delete_rule = 'RESTRICT')
    `);
    
    if (remaining.rows.length > 0) {
      console.log(`\n⚠️  Still ${remaining.rows.length} constraint(s) blocking deletion:`);
      for (const row of remaining.rows) {
        console.log(`  - ${row.table_name}.${row.column_name} (${row.delete_rule})`);
      }
    } else {
      console.log('✅ No blocking constraints found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixAllBlockingConstraints();


