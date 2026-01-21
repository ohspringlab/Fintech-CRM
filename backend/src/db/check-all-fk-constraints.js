require('dotenv').config();
const { pool } = require('./config');

async function checkAllFKConstraints() {
  try {
    console.log('Checking all foreign key constraints that might block user deletion...\n');
    
    // Get ALL foreign key constraints that reference users(id)
    const allConstraints = await pool.query(`
      SELECT 
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name,
        rc.delete_rule,
        rc.update_rule
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
    
    const problematic = [];
    const ok = [];
    
    for (const constraint of allConstraints.rows) {
      const { constraint_name, table_name, column_name, delete_rule } = constraint;
      const status = delete_rule === 'NO ACTION' || delete_rule === 'RESTRICT' ? '❌ BLOCKS DELETION' : '✅ OK';
      
      if (delete_rule === 'NO ACTION' || delete_rule === 'RESTRICT') {
        problematic.push(constraint);
        console.log(`  ${status} ${table_name}.${column_name}`);
        console.log(`    Constraint: ${constraint_name}`);
        console.log(`    Delete Rule: ${delete_rule}\n`);
      } else {
        ok.push(constraint);
        console.log(`  ${status} ${table_name}.${column_name} (${delete_rule})\n`);
      }
    }
    
    if (problematic.length > 0) {
      console.log(`\n⚠️  Found ${problematic.length} constraint(s) that will block user deletion:\n`);
      
      for (const constraint of problematic) {
        console.log(`Fixing: ${constraint.table_name}.${constraint.column_name}...`);
        
        // Determine appropriate delete rule
        let desiredRule = 'SET NULL';
        
        // For ownership relationships, CASCADE might be better
        if (constraint.table_name === 'crm_profiles' && constraint.column_name === 'user_id') {
          desiredRule = 'CASCADE'; // Delete profile when user is deleted
        } else if (constraint.table_name === 'email_verification_tokens' && constraint.column_name === 'user_id') {
          desiredRule = 'CASCADE'; // Delete tokens when user is deleted
        } else if (constraint.table_name === 'notifications' && constraint.column_name === 'user_id') {
          desiredRule = 'CASCADE'; // Delete notifications when user is deleted
        }
        
        try {
          // Drop existing constraint
          await pool.query(`
            ALTER TABLE ${constraint.table_name} 
            DROP CONSTRAINT IF EXISTS ${constraint.constraint_name}
          `);
          
          // Recreate with new delete rule
          await pool.query(`
            ALTER TABLE ${constraint.table_name}
            ADD CONSTRAINT ${constraint.constraint_name}
            FOREIGN KEY (${constraint.column_name})
            REFERENCES users(id)
            ON DELETE ${desiredRule}
          `);
          
          console.log(`  ✅ Updated to ON DELETE ${desiredRule}\n`);
        } catch (error) {
          console.error(`  ❌ Failed: ${error.message}\n`);
        }
      }
    } else {
      console.log('\n✅ All foreign key constraints are properly configured!\n');
    }
    
    // Also check for any other tables that might reference users
    console.log('\nChecking for any other potential issues...');
    const otherRefs = await pool.query(`
      SELECT 
        tc.table_name,
        kcu.column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name LIKE '%user%'
        AND kcu.column_name != 'user_id'
      ORDER BY tc.table_name
    `);
    
    if (otherRefs.rows.length > 0) {
      console.log(`\nFound ${otherRefs.rows.length} other user-related foreign keys:\n`);
      for (const ref of otherRefs.rows) {
        console.log(`  - ${ref.table_name}.${ref.column_name} (${ref.constraint_name})`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking constraints:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkAllFKConstraints();


