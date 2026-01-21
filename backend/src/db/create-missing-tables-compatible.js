require('dotenv').config();
const { pool } = require('./config');

async function createMissingTables() {
  try {
    console.log('🔧 Creating missing tables compatible with existing schema...\n');
    
    // Check if loan_requests exists
    const checkLoanRequests = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'loan_requests'
    `);
    
    if (checkLoanRequests.rows.length === 0) {
      console.log('➕ Creating loan_requests table...');
      
      // Get users.id type
      const userIdType = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id'
      `);
      const idType = userIdType.rows[0]?.data_type || 'VARCHAR(255)';
      
      await pool.query(`
        CREATE TABLE loan_requests (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          user_id ${idType} REFERENCES users(id) ON DELETE CASCADE,
          loan_number VARCHAR(20) UNIQUE,
          
          -- Subject Property
          property_address VARCHAR(255) NOT NULL,
          property_city VARCHAR(100) NOT NULL,
          property_state VARCHAR(50) NOT NULL,
          property_zip VARCHAR(10) NOT NULL,
          property_name VARCHAR(255),
          
          -- Property Type
          property_type VARCHAR(20) CHECK (property_type IN ('residential', 'commercial')),
          residential_units INTEGER,
          is_portfolio BOOLEAN DEFAULT false,
          portfolio_count INTEGER,
          commercial_type VARCHAR(50),
          
          -- Loan Product Type
          loan_product VARCHAR(50),
          
          -- Loan Details
          request_type VARCHAR(20) CHECK (request_type IN ('purchase', 'refinance')),
          transaction_type VARCHAR(50),
          borrower_type VARCHAR(30) CHECK (borrower_type IN ('owner_occupied', 'investment')),
          property_value DECIMAL(15,2),
          requested_ltv DECIMAL(5,2),
          loan_amount DECIMAL(15,2),
          documentation_type VARCHAR(50),
          
          -- DSCR Calculation Fields
          annual_rental_income DECIMAL(15,2),
          annual_operating_expenses DECIMAL(15,2),
          noi DECIMAL(15,2),
          annual_loan_payments DECIMAL(15,2),
          dscr_ratio DECIMAL(5,2),
          dscr_auto_declined BOOLEAN DEFAULT false,
          
          -- Status & Tracking
          status VARCHAR(50) DEFAULT 'draft',
          current_step INTEGER DEFAULT 1,
          
          -- Soft Quote
          soft_quote_generated BOOLEAN DEFAULT false,
          soft_quote_data JSONB,
          soft_quote_rate_min DECIMAL(5,3),
          soft_quote_rate_max DECIMAL(5,3),
          term_sheet_url VARCHAR(500),
          term_sheet_signed BOOLEAN DEFAULT false,
          term_sheet_signed_at TIMESTAMP,
          
          -- Credit Authorization
          credit_authorized BOOLEAN DEFAULT false,
          credit_auth_timestamp TIMESTAMP,
          credit_auth_ip VARCHAR(45),
          credit_status VARCHAR(20),
          credit_payment_id VARCHAR(255),
          credit_payment_amount DECIMAL(10,2),
          fico_pull_completed BOOLEAN DEFAULT false,
          fico_score INTEGER,
          
          -- Appraisal Payment
          appraisal_paid BOOLEAN DEFAULT false,
          appraisal_payment_id VARCHAR(255),
          appraisal_amount DECIMAL(10,2),
          appraisal_ordered BOOLEAN DEFAULT false,
          appraisal_received BOOLEAN DEFAULT false,
          
          -- Full Application
          full_application_data JSONB,
          full_application_completed BOOLEAN DEFAULT false,
          full_application_pdf_url VARCHAR(500),
          
          -- Commitment
          commitment_letter_url VARCHAR(500),
          conditional_items_needed TEXT,
          
          -- Closing
          closing_scheduled_date DATE,
          funded_date DATE,
          funded_amount DECIMAL(15,2),
          
          -- Processor Assignment
          assigned_processor_id ${idType} REFERENCES users(id),
          
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created loan_requests table');
    } else {
      console.log('✅ loan_requests table already exists');
    }
    
    // Check if loan_status_history exists
    const checkStatusHistory = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'loan_status_history'
    `);
    
    if (checkStatusHistory.rows.length === 0) {
      console.log('➕ Creating loan_status_history table...');
      const userIdType = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id'
      `);
      const idType = userIdType.rows[0]?.data_type || 'VARCHAR(255)';
      
      await pool.query(`
        CREATE TABLE loan_status_history (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          loan_id VARCHAR(255) REFERENCES loan_requests(id) ON DELETE CASCADE,
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
    
    // Check if audit_logs exists
    const checkAuditLogs = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'audit_logs'
    `);
    
    if (checkAuditLogs.rows.length === 0) {
      console.log('➕ Creating audit_logs table...');
      const userIdType = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id'
      `);
      const idType = userIdType.rows[0]?.data_type || 'VARCHAR(255)';
      
      await pool.query(`
        CREATE TABLE audit_logs (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          user_id ${idType} REFERENCES users(id),
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50),
          entity_id VARCHAR(255),
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
    
    // Check if notifications exists
    const checkNotifications = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'notifications'
    `);
    
    if (checkNotifications.rows.length === 0) {
      console.log('➕ Creating notifications table...');
      const userIdType = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id'
      `);
      const idType = userIdType.rows[0]?.data_type || 'VARCHAR(255)';
      
      await pool.query(`
        CREATE TABLE notifications (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          user_id ${idType} REFERENCES users(id) ON DELETE CASCADE,
          loan_id VARCHAR(255) REFERENCES loan_requests(id),
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
    
    // Check if email_queue exists
    const checkEmailQueue = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'email_queue'
    `);
    
    if (checkEmailQueue.rows.length === 0) {
      console.log('➕ Creating email_queue table...');
      const userIdType = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id'
      `);
      const idType = userIdType.rows[0]?.data_type || 'VARCHAR(255)';
      
      await pool.query(`
        CREATE TABLE email_queue (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          user_id ${idType} REFERENCES users(id),
          loan_id VARCHAR(255) REFERENCES loan_requests(id),
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
    
    // Check if email_verification_tokens exists
    const checkEmailVerification = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'email_verification_tokens'
    `);
    
    if (checkEmailVerification.rows.length === 0) {
      console.log('➕ Creating email_verification_tokens table...');
      const userIdType = await pool.query(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id'
      `);
      const idType = userIdType.rows[0]?.data_type || 'VARCHAR(255)';
      
      await pool.query(`
        CREATE TABLE email_verification_tokens (
          user_id ${idType} PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) UNIQUE NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created email_verification_tokens table');
    } else {
      console.log('✅ email_verification_tokens table already exists');
    }
    
    // Check if contact_messages exists
    const checkContactMessages = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'contact_messages'
    `);
    
    if (checkContactMessages.rows.length === 0) {
      console.log('➕ Creating contact_messages table...');
      await pool.query(`
        CREATE TABLE contact_messages (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          subject VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          loan_type VARCHAR(50),
          status VARCHAR(20) DEFAULT 'new',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created contact_messages table');
    } else {
      console.log('✅ contact_messages table already exists');
    }
    
    // Check if closing_checklist exists
    const checkClosingChecklist = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'closing_checklist'
    `);
    
    if (checkClosingChecklist.rows.length === 0) {
      console.log('➕ Creating closing_checklist table...');
      await pool.query(`
        CREATE TABLE closing_checklist (
          id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
          loan_id VARCHAR(255) REFERENCES loan_requests(id) ON DELETE CASCADE,
          item_name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(50),
          required BOOLEAN DEFAULT false,
          completed BOOLEAN DEFAULT false,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Created closing_checklist table');
    } else {
      console.log('✅ closing_checklist table already exists');
    }
    
    // Create indexes
    console.log('\n➕ Creating indexes...');
    try {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_loans_user ON loan_requests(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_loans_status ON loan_requests(status)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_loans_processor ON loan_requests(assigned_processor_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_documents_loan ON documents(loan_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_needs_list_loan ON needs_list_items(loan_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status)');
      console.log('✅ Indexes created');
    } catch (error) {
      console.log('⚠️  Some indexes may already exist:', error.message);
    }
    
    console.log('\n✅ All required tables created!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create tables:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createMissingTables();

