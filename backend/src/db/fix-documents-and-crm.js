require('dotenv').config();
const { pool } = require('./config');

async function fixDocumentsAndCrm() {
  try {
    console.log('🔧 Fixing documents table and creating crm_profiles table...\n');
    
    // 1. Add needs_list_item_id to documents table
    console.log('1️⃣  Checking documents table...');
    const checkNeedsListItemId = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name = 'needs_list_item_id'
    `);
    
    if (checkNeedsListItemId.rows.length === 0) {
      console.log('   ➕ Adding needs_list_item_id column to documents table...');
      
      // Check the id type used in needs_list_items table
      const idTypeResult = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'needs_list_items' AND column_name = 'id'
      `);
      const idType = idTypeResult.rows[0]?.data_type === 'uuid' ? 'UUID' : 'VARCHAR(255)';
      
      await pool.query(`
        ALTER TABLE documents 
        ADD COLUMN needs_list_item_id ${idType} REFERENCES needs_list_items(id)
      `);
      console.log('   ✅ Added needs_list_item_id column');
    } else {
      console.log('   ✅ needs_list_item_id column already exists');
    }
    
    // 2. Create crm_profiles table
    console.log('\n2️⃣  Checking crm_profiles table...');
    const checkCrmProfiles = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'crm_profiles'
    `);
    
    if (checkCrmProfiles.rows.length === 0) {
      console.log('   ➕ Creating crm_profiles table...');
      
      // Check the id type used in users table
      const userIdTypeResult = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id'
      `);
      const idType = userIdTypeResult.rows[0]?.data_type === 'uuid' ? 'UUID' : 'VARCHAR(255)';
      const idDefault = idType === 'UUID' ? 'DEFAULT gen_random_uuid()' : '';
      
      await pool.query(`
        CREATE TABLE crm_profiles (
          id ${idType} PRIMARY KEY ${idDefault},
          user_id ${idType} NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          ssn_last_four VARCHAR(4),
          date_of_birth DATE,
          address_line1 VARCHAR(255),
          address_line2 VARCHAR(255),
          city VARCHAR(100),
          state VARCHAR(50),
          zip_code VARCHAR(10),
          employment_status VARCHAR(50),
          annual_income DECIMAL(15,2),
          credit_score INTEGER,
          credit_score_range VARCHAR(20),
          fico_score INTEGER,
          kyc_verified BOOLEAN DEFAULT false,
          kyc_verified_at TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create index on user_id for faster lookups
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_crm_profiles_user_id ON crm_profiles(user_id)
      `);
      
      console.log('   ✅ Created crm_profiles table with indexes');
    } else {
      console.log('   ✅ crm_profiles table already exists');
    }
    
    console.log('\n✅ All fixes completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix tables:', error.message);
    console.error(error);
    process.exit(1);
  }
}

fixDocumentsAndCrm();

