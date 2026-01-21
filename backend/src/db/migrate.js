require('dotenv').config();
const { pool } = require('./config');

const migrations = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
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
);

-- CRM Profiles (extended borrower info)
CREATE TABLE IF NOT EXISTS crm_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
);

-- Loan Requests
CREATE TABLE IF NOT EXISTS loan_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
  assigned_processor_id UUID REFERENCES users(id),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loan Status History (Audit Trail)
CREATE TABLE IF NOT EXISTS loan_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loan_requests(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  step INTEGER,
  changed_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Needs List Items with folder tracking
CREATE TABLE IF NOT EXISTS needs_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loan_requests(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  folder_name VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'reviewed', 'rejected')),
  required BOOLEAN DEFAULT true,
  requested_by UUID REFERENCES users(id),
  reviewed_by UUID REFERENCES users(id),
  review_notes TEXT,
  last_upload_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents with folder organization
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loan_requests(id) ON DELETE CASCADE,
  needs_list_item_id UUID REFERENCES needs_list_items(id),
  user_id UUID REFERENCES users(id),
  folder_name VARCHAR(100),
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100),
  file_size INTEGER,
  storage_path VARCHAR(500) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loan_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  payment_type VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_id VARCHAR(255),
  stripe_payment_intent VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES loan_requests(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Queue for HubSpot integration
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  loan_id UUID REFERENCES loan_requests(id),
  email_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  template_data JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loans_user ON loan_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loan_requests(status);
CREATE INDEX IF NOT EXISTS idx_loans_processor ON loan_requests(assigned_processor_id);
CREATE INDEX IF NOT EXISTS idx_documents_loan ON documents(loan_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_name);
CREATE INDEX IF NOT EXISTS idx_needs_list_loan ON needs_list_items(loan_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);

-- Add missing columns to existing tables (if they don't exist)
DO $$ 
BEGIN
  -- Add full_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE users ADD COLUMN full_name VARCHAR(255);
    -- Update existing rows if any (set a default value)
    UPDATE users SET full_name = email WHERE full_name IS NULL;
    -- Now make it NOT NULL if there are no NULL values
    ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;
  END IF;
END $$;
`;

async function migrate() {
  try {
    console.log('Running database migrations...');
    await pool.query(migrations);
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
