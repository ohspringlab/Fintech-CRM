require('dotenv').config();
const { pool } = require('./config');

async function checkDocumentsTable() {
  try {
    console.log('Checking documents table structure...\n');
    
    // Get all columns in documents table
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'documents'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns in documents table:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    const columnNames = columns.rows.map(r => r.column_name);
    
    // Check for missing columns
    const requiredColumns = {
      'file_name': 'VARCHAR(255)',
      'original_name': 'VARCHAR(255)',
      'file_type': 'VARCHAR(100)',
      'file_size': 'INTEGER',
      'storage_path': 'VARCHAR(500)',
      'folder_name': 'VARCHAR(100)',
      'uploaded_at': 'TIMESTAMP',
      'needs_list_item_id': null, // Will be determined dynamically
      'user_id': null, // Will be determined dynamically
      'loan_id': null // Will be determined dynamically
    };
    
    console.log('\nChecking for missing columns...\n');
    
    // Check id type for foreign keys
    const loanIdType = await pool.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'loan_requests' AND column_name = 'id'
    `);
    const idType = loanIdType.rows[0]?.data_type === 'uuid' ? 'UUID' : 'VARCHAR(255)';
    
    for (const [colName, colType] of Object.entries(requiredColumns)) {
      if (!columnNames.includes(colName)) {
        console.log(`Adding missing column: ${colName}...`);
        
        let sqlType = colType;
        if (colName === 'needs_list_item_id' || colName === 'user_id' || colName === 'loan_id') {
          sqlType = idType;
        }
        
        if (colName === 'file_name' || colName === 'original_name' || colName === 'storage_path') {
          await pool.query(`ALTER TABLE documents ADD COLUMN ${colName} ${sqlType} NOT NULL DEFAULT ''`);
          // Remove default after adding
          await pool.query(`ALTER TABLE documents ALTER COLUMN ${colName} DROP DEFAULT`);
        } else if (colName === 'uploaded_at') {
          await pool.query(`ALTER TABLE documents ADD COLUMN ${colName} ${sqlType} DEFAULT CURRENT_TIMESTAMP`);
        } else {
          await pool.query(`ALTER TABLE documents ADD COLUMN ${colName} ${sqlType}`);
        }
        
        console.log(`  ✅ Added ${colName}`);
      } else {
        console.log(`  ✅ ${colName} exists`);
      }
    }
    
    // Check for foreign key constraints
    console.log('\nChecking foreign key constraints...');
    const fks = await pool.query(`
      SELECT tc.constraint_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.table_name = 'documents' 
        AND tc.constraint_type = 'FOREIGN KEY'
    `);
    
    if (fks.rows.length > 0) {
      console.log('  Foreign keys found:');
      fks.rows.forEach(fk => {
        console.log(`    - ${fk.column_name} (${fk.constraint_name})`);
      });
    } else {
      console.log('  No foreign keys found');
    }
    
    console.log('\n✅ Documents table check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking documents table:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkDocumentsTable();

