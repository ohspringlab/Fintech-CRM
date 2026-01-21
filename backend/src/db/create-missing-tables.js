require('dotenv').config();
const { pool } = require('./config');

async function tableExists(tableName) {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_name = $1
    )
  `, [tableName]);
  return result.rows[0].exists;
}

async function createMissingTables() {
  try {
    console.log('Creating missing database tables...\n');

    // Create users table if it doesn't exist
    if (!(await tableExists('users'))) {
      console.log('Creating users table...');
      await pool.query(`
        CREATE TABLE users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(255) NOT NULL,
          phone VARCHAR(20) NOT NULL,
          role VARCHAR(20) DEFAULT 'borrower' CHECK (role IN ('borrower', 'operations', 'admin')),
          is_active BOOLEAN DEFAULT true,
          email_verified BOOLEAN DEFAULT false,
          hubspot_contact_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created users table');
    } else {
      console.log('✅ users table already exists');
      // Ensure required columns exist
      const columns = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'users'
      `);
      const columnNames = columns.rows.map(r => r.column_name);
      
      if (!columnNames.includes('full_name')) {
        console.log('  Adding full_name column...');
        await pool.query(`ALTER TABLE users ADD COLUMN full_name VARCHAR(255)`);
        await pool.query(`UPDATE users SET full_name = COALESCE(email, 'Unknown') WHERE full_name IS NULL`);
        await pool.query(`ALTER TABLE users ALTER COLUMN full_name SET NOT NULL`);
      }
      
      if (!columnNames.includes('phone')) {
        console.log('  Adding phone column...');
        await pool.query(`ALTER TABLE users ADD COLUMN phone VARCHAR(20)`);
        await pool.query(`UPDATE users SET phone = '000-000-0000' WHERE phone IS NULL`);
        await pool.query(`ALTER TABLE users ALTER COLUMN phone SET NOT NULL`);
      }
    }

    // Check users table id type
    const usersIdType = await pool.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    const idType = usersIdType.rows[0]?.data_type === 'uuid' ? 'UUID' : 'VARCHAR(255)';
    const idDefault = usersIdType.rows[0]?.data_type === 'uuid' 
      ? 'DEFAULT gen_random_uuid()' 
      : '';

    // Create crm_profiles table
    if (!(await tableExists('crm_profiles'))) {
      console.log('Creating crm_profiles table...');
      await pool.query(`
        CREATE TABLE crm_profiles (
          id ${idType} PRIMARY KEY ${idDefault},
          user_id ${idType} REFERENCES users(id) ON DELETE CASCADE,
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
      console.log('✅ Created crm_profiles table');
    } else {
      console.log('✅ crm_profiles table already exists');
    }

    // Create loan_requests table
    if (!(await tableExists('loan_requests'))) {
      console.log('Creating loan_requests table...');
      await pool.query(`
        CREATE TABLE loan_requests (
          id ${idType} PRIMARY KEY ${idDefault},
          user_id ${idType} REFERENCES users(id) ON DELETE CASCADE,
          loan_number VARCHAR(20) UNIQUE,
          property_address VARCHAR(255) NOT NULL,
          property_city VARCHAR(100) NOT NULL,
          property_state VARCHAR(50) NOT NULL,
          property_zip VARCHAR(10) NOT NULL,
          property_name VARCHAR(255),
          property_type VARCHAR(20) CHECK (property_type IN ('residential', 'commercial')),
          residential_units INTEGER,
          is_portfolio BOOLEAN DEFAULT false,
          portfolio_count INTEGER,
          commercial_type VARCHAR(50),
          loan_product VARCHAR(50),
          request_type VARCHAR(20) CHECK (request_type IN ('purchase', 'refinance')),
          transaction_type VARCHAR(50),
          borrower_type VARCHAR(30) CHECK (borrower_type IN ('owner_occupied', 'investment')),
          property_value DECIMAL(15,2),
          requested_ltv DECIMAL(5,2),
          loan_amount DECIMAL(15,2),
          documentation_type VARCHAR(50),
          annual_rental_income DECIMAL(15,2),
          annual_operating_expenses DECIMAL(15,2),
          noi DECIMAL(15,2),
          annual_loan_payments DECIMAL(15,2),
          dscr_ratio DECIMAL(5,2),
          dscr_auto_declined BOOLEAN DEFAULT false,
          status VARCHAR(50) DEFAULT 'draft',
          current_step INTEGER DEFAULT 1,
          soft_quote_generated BOOLEAN DEFAULT false,
          soft_quote_data JSONB,
          soft_quote_rate_min DECIMAL(5,3),
          soft_quote_rate_max DECIMAL(5,3),
          term_sheet_url VARCHAR(500),
          term_sheet_signed BOOLEAN DEFAULT false,
          term_sheet_signed_at TIMESTAMP,
          credit_authorized BOOLEAN DEFAULT false,
          credit_auth_timestamp TIMESTAMP,
          credit_auth_ip VARCHAR(45),
          credit_status VARCHAR(20),
          credit_payment_id VARCHAR(255),
          credit_payment_amount DECIMAL(10,2),
          fico_pull_completed BOOLEAN DEFAULT false,
          fico_score INTEGER,
          appraisal_paid BOOLEAN DEFAULT false,
          appraisal_payment_id VARCHAR(255),
          appraisal_amount DECIMAL(10,2),
          appraisal_ordered BOOLEAN DEFAULT false,
          appraisal_received BOOLEAN DEFAULT false,
          full_application_data JSONB,
          full_application_completed BOOLEAN DEFAULT false,
          full_application_pdf_url VARCHAR(500),
          commitment_letter_url VARCHAR(500),
          conditional_items_needed TEXT,
          closing_scheduled_date DATE,
          funded_date DATE,
          funded_amount DECIMAL(15,2),
          assigned_processor_id ${idType} REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created loan_requests table');
    } else {
      console.log('✅ loan_requests table already exists');
    }

    // Create loan_status_history table
    if (!(await tableExists('loan_status_history'))) {
      console.log('Creating loan_status_history table...');
      await pool.query(`
        CREATE TABLE loan_status_history (
          id ${idType} PRIMARY KEY ${idDefault},
          loan_id ${idType} REFERENCES loan_requests(id) ON DELETE CASCADE,
          status VARCHAR(50) NOT NULL,
          step INTEGER,
          changed_by ${idType} REFERENCES users(id),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created loan_status_history table');
    } else {
      console.log('✅ loan_status_history table already exists');
    }

    // Create needs_list_items table
    if (!(await tableExists('needs_list_items'))) {
      console.log('Creating needs_list_items table...');
      await pool.query(`
        CREATE TABLE needs_list_items (
          id ${idType} PRIMARY KEY ${idDefault},
          loan_id ${idType} REFERENCES loan_requests(id) ON DELETE CASCADE,
          document_type VARCHAR(100) NOT NULL,
          folder_name VARCHAR(100) NOT NULL,
          description TEXT,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'reviewed', 'rejected')),
          required BOOLEAN DEFAULT true,
          requested_by ${idType} REFERENCES users(id),
          reviewed_by ${idType} REFERENCES users(id),
          review_notes TEXT,
          last_upload_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created needs_list_items table');
    } else {
      console.log('✅ needs_list_items table already exists');
    }

    // Create documents table
    if (!(await tableExists('documents'))) {
      console.log('Creating documents table...');
      await pool.query(`
        CREATE TABLE documents (
          id ${idType} PRIMARY KEY ${idDefault},
          loan_id ${idType} REFERENCES loan_requests(id) ON DELETE CASCADE,
          needs_list_item_id ${idType} REFERENCES needs_list_items(id),
          user_id ${idType} REFERENCES users(id),
          folder_name VARCHAR(100),
          file_name VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          file_type VARCHAR(100),
          file_size INTEGER,
          storage_path VARCHAR(500) NOT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created documents table');
    } else {
      console.log('✅ documents table already exists');
    }

    // Create payments table
    if (!(await tableExists('payments'))) {
      console.log('Creating payments table...');
      await pool.query(`
        CREATE TABLE payments (
          id ${idType} PRIMARY KEY ${idDefault},
          loan_id ${idType} REFERENCES loan_requests(id) ON DELETE CASCADE,
          user_id ${idType} REFERENCES users(id),
          payment_type VARCHAR(50) NOT NULL,
          description VARCHAR(255),
          amount DECIMAL(10,2) NOT NULL,
          stripe_payment_id VARCHAR(255),
          stripe_payment_intent VARCHAR(255),
          status VARCHAR(20) DEFAULT 'pending',
          paid_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created payments table');
    } else {
      console.log('✅ payments table already exists');
    }

    // Create audit_logs table
    if (!(await tableExists('audit_logs'))) {
      console.log('Creating audit_logs table...');
      await pool.query(`
        CREATE TABLE audit_logs (
          id ${idType} PRIMARY KEY ${idDefault},
          user_id ${idType} REFERENCES users(id),
          entity_id ${idType},
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50),
          ip_address VARCHAR(45),
          user_agent TEXT,
          details JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created audit_logs table');
    } else {
      console.log('✅ audit_logs table already exists');
    }

    // Create notifications table
    if (!(await tableExists('notifications'))) {
      console.log('Creating notifications table...');
      await pool.query(`
        CREATE TABLE notifications (
          id ${idType} PRIMARY KEY ${idDefault},
          user_id ${idType} REFERENCES users(id) ON DELETE CASCADE,
          loan_id ${idType} REFERENCES loan_requests(id),
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created notifications table');
    } else {
      console.log('✅ notifications table already exists');
    }

    // Create email_queue table
    if (!(await tableExists('email_queue'))) {
      console.log('Creating email_queue table...');
      await pool.query(`
        CREATE TABLE email_queue (
          id ${idType} PRIMARY KEY ${idDefault},
          user_id ${idType} REFERENCES users(id),
          loan_id ${idType} REFERENCES loan_requests(id),
          email_type VARCHAR(50) NOT NULL,
          recipient_email VARCHAR(255) NOT NULL,
          subject VARCHAR(255),
          template_data JSONB,
          status VARCHAR(20) DEFAULT 'pending',
          sent_at TIMESTAMP,
          error_message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created email_queue table');
    } else {
      console.log('✅ email_queue table already exists');
    }

    // Create indexes
    console.log('\nCreating indexes...');
    const indexes = [
      { name: 'idx_loans_user', table: 'loan_requests', column: 'user_id' },
      { name: 'idx_loans_status', table: 'loan_requests', column: 'status' },
      { name: 'idx_loans_processor', table: 'loan_requests', column: 'assigned_processor_id' },
      { name: 'idx_documents_loan', table: 'documents', column: 'loan_id' },
      { name: 'idx_documents_folder', table: 'documents', column: 'folder_name' },
      { name: 'idx_needs_list_loan', table: 'needs_list_items', column: 'loan_id' },
      { name: 'idx_audit_user', table: 'audit_logs', column: 'user_id' },
      { name: 'idx_notifications_user', table: 'notifications', column: 'user_id' },
      { name: 'idx_email_queue_status', table: 'email_queue', column: 'status' }
    ];

    for (const idx of indexes) {
      try {
        await pool.query(`
          CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.column})
        `);
      } catch (error) {
        // Index might already exist or table might not exist yet, skip
        console.log(`  ⚠️  Could not create index ${idx.name}: ${error.message}`);
      }
    }

    console.log('\n✅ All tables and indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createMissingTables();

