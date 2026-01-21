require('dotenv').config();
const { pool } = require('./config');

async function checkNeedsListItemsTable() {
  try {
    console.log('Checking needs_list_items table structure...\n');
    
    // Get all columns in needs_list_items table
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'needs_list_items'
      ORDER BY ordinal_position
    `);
    
    console.log('Current columns in needs_list_items table:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    const columnNames = columns.rows.map(r => r.column_name);
    
    // Required columns based on code usage
    const requiredColumns = {
      'document_type': 'VARCHAR(100)',
      'folder_name': 'VARCHAR(100)',
      'description': 'TEXT',
      'status': 'VARCHAR(20)',
      'required': 'BOOLEAN',
      'loan_id': null, // Will be determined dynamically
      'requested_by': null, // Will be determined dynamically
      'reviewed_by': null, // Will be determined dynamically
      'review_notes': 'TEXT',
      'last_upload_at': 'TIMESTAMP',
      'created_at': 'TIMESTAMP',
      'updated_at': 'TIMESTAMP'
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
        let sqlDefault = '';
        let sqlNullable = '';
        
        if (colName === 'loan_id' || colName === 'requested_by' || colName === 'reviewed_by') {
          sqlType = idType;
          sqlNullable = '';
        } else if (colName === 'document_type') {
          sqlType = 'VARCHAR(100)';
          sqlNullable = 'NOT NULL';
          sqlDefault = "DEFAULT ''";
        } else if (colName === 'folder_name') {
          sqlType = 'VARCHAR(100)';
          sqlNullable = 'NOT NULL';
          sqlDefault = "DEFAULT 'uncategorized'";
        } else if (colName === 'status') {
          sqlType = 'VARCHAR(20)';
          sqlNullable = '';
          sqlDefault = "DEFAULT 'pending'";
        } else if (colName === 'required') {
          sqlType = 'BOOLEAN';
          sqlNullable = '';
          sqlDefault = "DEFAULT true";
        } else if (colName === 'created_at' || colName === 'updated_at') {
          sqlType = 'TIMESTAMP';
          sqlNullable = '';
          sqlDefault = "DEFAULT CURRENT_TIMESTAMP";
        } else {
          sqlNullable = '';
        }
        
        const alterSql = `ALTER TABLE needs_list_items ADD COLUMN ${colName} ${sqlType} ${sqlDefault} ${sqlNullable}`.trim().replace(/\s+/g, ' ');
        await pool.query(alterSql);
        
        // Update existing rows with defaults if needed
        if (colName === 'document_type') {
          await pool.query(`UPDATE needs_list_items SET document_type = 'Document' WHERE document_type IS NULL OR document_type = ''`);
        } else if (colName === 'folder_name') {
          await pool.query(`UPDATE needs_list_items SET folder_name = 'uncategorized' WHERE folder_name IS NULL OR folder_name = ''`);
        } else if (colName === 'status') {
          await pool.query(`UPDATE needs_list_items SET status = 'pending' WHERE status IS NULL`);
        } else if (colName === 'required') {
          await pool.query(`UPDATE needs_list_items SET required = true WHERE required IS NULL`);
        }
        
        console.log(`  ✅ Added ${colName}`);
      } else {
        console.log(`  ✅ ${colName} exists`);
      }
    }
    
    console.log('\n✅ Needs list items table check complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking needs_list_items table:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkNeedsListItemsTable();

