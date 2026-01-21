require('dotenv').config();
const { pool } = require('./config');

async function fixNeedsListItems() {
  try {
    console.log('🔧 Fixing needs_list_items table schema...\n');
    
    // Check existing columns
    const existingColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'needs_list_items'
      ORDER BY column_name
    `);
    
    console.log('Existing columns:');
    existingColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    console.log('');
    
    // Add loan_id if it doesn't exist
    const hasLoanId = existingColumns.rows.some(r => r.column_name === 'loan_id');
    if (!hasLoanId) {
      console.log('➕ Adding loan_id column...');
      // Check loan_requests table to get the correct ID type
      const loanIdType = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'loan_requests' AND column_name = 'id'
      `);
      const idType = loanIdType.rows[0]?.data_type || 'VARCHAR(255)';
      
      await pool.query(`
        ALTER TABLE needs_list_items 
        ADD COLUMN loan_id ${idType}
      `);
      
      // Add foreign key constraint if loan_requests exists
      try {
        await pool.query(`
          ALTER TABLE needs_list_items 
          ADD CONSTRAINT needs_list_items_loan_id_fkey 
          FOREIGN KEY (loan_id) REFERENCES loan_requests(id) ON DELETE CASCADE
        `);
        console.log('✅ Added loan_id column with foreign key');
      } catch (error) {
        console.log('⚠️  Added loan_id column (foreign key may already exist)');
      }
    } else {
      console.log('✅ loan_id column already exists');
    }
    
    // Add document_type if it doesn't exist
    const hasDocumentType = existingColumns.rows.some(r => r.column_name === 'document_type');
    if (!hasDocumentType) {
      console.log('➕ Adding document_type column...');
      await pool.query(`
        ALTER TABLE needs_list_items 
        ADD COLUMN document_type VARCHAR(100)
      `);
      console.log('✅ Added document_type column');
    } else {
      console.log('✅ document_type column already exists');
    }
    
    // Add folder_name if it doesn't exist
    const hasFolderName = existingColumns.rows.some(r => r.column_name === 'folder_name');
    if (!hasFolderName) {
      console.log('➕ Adding folder_name column...');
      await pool.query(`
        ALTER TABLE needs_list_items 
        ADD COLUMN folder_name VARCHAR(100)
      `);
      console.log('✅ Added folder_name column');
    } else {
      console.log('✅ folder_name column already exists');
    }
    
    // Add status if it doesn't exist
    const hasStatus = existingColumns.rows.some(r => r.column_name === 'status');
    if (!hasStatus) {
      console.log('➕ Adding status column...');
      await pool.query(`
        ALTER TABLE needs_list_items 
        ADD COLUMN status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'uploaded', 'reviewed', 'rejected'))
      `);
      console.log('✅ Added status column');
    } else {
      console.log('✅ status column already exists');
    }
    
    // Add required if it doesn't exist (check for is_required)
    const hasRequired = existingColumns.rows.some(r => r.column_name === 'required');
    const hasIsRequired = existingColumns.rows.some(r => r.column_name === 'is_required');
    
    if (!hasRequired && !hasIsRequired) {
      console.log('➕ Adding required column...');
      await pool.query(`
        ALTER TABLE needs_list_items 
        ADD COLUMN required BOOLEAN DEFAULT true
      `);
      console.log('✅ Added required column');
    } else if (hasIsRequired && !hasRequired) {
      console.log('ℹ️  Table has is_required, code will need to use that');
    } else {
      console.log('✅ required column already exists');
    }
    
    // Add requested_by if it doesn't exist
    const hasRequestedBy = existingColumns.rows.some(r => r.column_name === 'requested_by');
    if (!hasRequestedBy) {
      console.log('➕ Adding requested_by column...');
      const userIdType = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id'
      `);
      const idType = userIdType.rows[0]?.data_type || 'VARCHAR(255)';
      
      await pool.query(`
        ALTER TABLE needs_list_items 
        ADD COLUMN requested_by ${idType} REFERENCES users(id)
      `);
      console.log('✅ Added requested_by column');
    } else {
      console.log('✅ requested_by column already exists');
    }
    
    // Add reviewed_by if it doesn't exist
    const hasReviewedBy = existingColumns.rows.some(r => r.column_name === 'reviewed_by');
    if (!hasReviewedBy) {
      console.log('➕ Adding reviewed_by column...');
      const userIdType = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id'
      `);
      const idType = userIdType.rows[0]?.data_type || 'VARCHAR(255)';
      
      await pool.query(`
        ALTER TABLE needs_list_items 
        ADD COLUMN reviewed_by ${idType} REFERENCES users(id)
      `);
      console.log('✅ Added reviewed_by column');
    } else {
      console.log('✅ reviewed_by column already exists');
    }
    
    // Add review_notes if it doesn't exist
    const hasReviewNotes = existingColumns.rows.some(r => r.column_name === 'review_notes');
    if (!hasReviewNotes) {
      console.log('➕ Adding review_notes column...');
      await pool.query(`
        ALTER TABLE needs_list_items 
        ADD COLUMN review_notes TEXT
      `);
      console.log('✅ Added review_notes column');
    } else {
      console.log('✅ review_notes column already exists');
    }
    
    // Add last_upload_at if it doesn't exist
    const hasLastUploadAt = existingColumns.rows.some(r => r.column_name === 'last_upload_at');
    if (!hasLastUploadAt) {
      console.log('➕ Adding last_upload_at column...');
      await pool.query(`
        ALTER TABLE needs_list_items 
        ADD COLUMN last_upload_at TIMESTAMP
      `);
      console.log('✅ Added last_upload_at column');
    } else {
      console.log('✅ last_upload_at column already exists');
    }
    
    // Add created_at and updated_at if they don't exist
    const hasCreatedAt = existingColumns.rows.some(r => r.column_name === 'created_at');
    if (!hasCreatedAt) {
      console.log('➕ Adding created_at column...');
      await pool.query(`
        ALTER TABLE needs_list_items 
        ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Added created_at column');
    } else {
      console.log('✅ created_at column already exists');
    }
    
    const hasUpdatedAt = existingColumns.rows.some(r => r.column_name === 'updated_at');
    if (!hasUpdatedAt) {
      console.log('➕ Adding updated_at column...');
      await pool.query(`
        ALTER TABLE needs_list_items 
        ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
      console.log('✅ Added updated_at column');
    } else {
      console.log('✅ updated_at column already exists');
    }
    
    console.log('\n✅ needs_list_items table schema is now compatible!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix schema:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixNeedsListItems();

