require('dotenv').config();
const { pool } = require('./config');

async function createMissingTables() {
  try {
    console.log('Creating missing tables...');

    // Check if crm_profiles exists
    const crmProfilesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'crm_profiles'
    `);

    if (crmProfilesCheck.rows.length === 0) {
      console.log('Creating crm_profiles table...');
      await pool.query(`
        CREATE TABLE crm_profiles (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
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
      console.log('✅ crm_profiles table created');
    } else {
      console.log('✅ crm_profiles table already exists');
    }

    // Check if loan_requests exists
    const loanRequestsCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'loan_requests'
    `);

    if (loanRequestsCheck.rows.length === 0) {
      console.log('Creating loan_requests table...');
      // Use VARCHAR for user_id to match existing users.id type
      await pool.query(`
        CREATE TABLE loan_requests (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
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
          assigned_processor_id VARCHAR(255) REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ loan_requests table created');
    } else {
      console.log('✅ loan_requests table already exists');
    }

    // Check if audit_logs exists
    const auditLogsCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'audit_logs'
    `);

    if (auditLogsCheck.rows.length === 0) {
      console.log('Creating audit_logs table...');
      await pool.query(`
        CREATE TABLE audit_logs (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id),
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50),
          entity_id VARCHAR(255),
          ip_address VARCHAR(45),
          user_agent TEXT,
          details JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ audit_logs table created');
    } else {
      console.log('✅ audit_logs table already exists');
    }

    // Check if loan_status_history exists
    const statusHistoryCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'loan_status_history'
    `);

    if (statusHistoryCheck.rows.length === 0) {
      console.log('Creating loan_status_history table...');
      await pool.query(`
        CREATE TABLE loan_status_history (
          id VARCHAR(255) PRIMARY KEY,
          loan_id VARCHAR(255) REFERENCES loan_requests(id) ON DELETE CASCADE,
          status VARCHAR(50) NOT NULL,
          step INTEGER,
          changed_by VARCHAR(255) REFERENCES users(id),
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ loan_status_history table created');
    } else {
      console.log('✅ loan_status_history table already exists');
    }

    // Check if notifications exists
    const notificationsCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'notifications'
    `);

    if (notificationsCheck.rows.length === 0) {
      console.log('Creating notifications table...');
      await pool.query(`
        CREATE TABLE notifications (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
          loan_id VARCHAR(255) REFERENCES loan_requests(id),
          type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ notifications table created');
    } else {
      console.log('✅ notifications table already exists');
    }

    // Check if email_queue exists
    const emailQueueCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'email_queue'
    `);

    if (emailQueueCheck.rows.length === 0) {
      console.log('Creating email_queue table...');
      await pool.query(`
        CREATE TABLE email_queue (
          id VARCHAR(255) PRIMARY KEY,
          user_id VARCHAR(255) REFERENCES users(id),
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
      console.log('✅ email_queue table created');
    } else {
      console.log('✅ email_queue table already exists');
    }

    // Check if email_verification_tokens exists
    const emailVerificationCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'email_verification_tokens'
    `);

    if (emailVerificationCheck.rows.length === 0) {
      console.log('Creating email_verification_tokens table...');
      await pool.query(`
        CREATE TABLE email_verification_tokens (
          user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          token VARCHAR(255) NOT NULL UNIQUE,
          expires_at TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ email_verification_tokens table created');
    } else {
      console.log('✅ email_verification_tokens table already exists');
    }

    // Check if closing_checklist_items exists
    const closingChecklistCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'closing_checklist_items'
    `);

    if (closingChecklistCheck.rows.length === 0) {
      console.log('Creating closing_checklist_items table...');
      await pool.query(`
        CREATE TABLE closing_checklist_items (
          id VARCHAR(255) PRIMARY KEY,
          loan_id VARCHAR(255) REFERENCES loan_requests(id) ON DELETE CASCADE,
          item_name VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'waived')),
          completed_by VARCHAR(255) REFERENCES users(id),
          completed_at TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ closing_checklist_items table created');
    } else {
      console.log('✅ closing_checklist_items table already exists');
    }

    console.log('\n✅ All missing tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create tables:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

createMissingTables();

