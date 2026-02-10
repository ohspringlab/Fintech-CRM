require('dotenv').config();
const { pool } = require('./config');

const migrations = `
-- Add broker role to users table
DO $$ 
BEGIN
  -- First, update any invalid roles to 'borrower' as default
  UPDATE users 
  SET role = 'borrower' 
  WHERE role NOT IN ('borrower', 'broker', 'operations', 'admin');
  
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_role_check' AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;
  
  -- Add new constraint with broker role
  ALTER TABLE users 
    ADD CONSTRAINT users_role_check 
    CHECK (role IN ('borrower', 'broker', 'operations', 'admin'));
END $$;

-- Add broker/referral tracking to loan_requests
DO $$ 
DECLARE
  users_id_type VARCHAR;
BEGIN
  -- Get the actual data type of users.id
  SELECT data_type INTO users_id_type
  FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'id';
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loan_requests' AND column_name = 'broker_id'
  ) THEN
    IF users_id_type = 'uuid' THEN
      ALTER TABLE loan_requests ADD COLUMN broker_id UUID REFERENCES users(id);
    ELSE
      ALTER TABLE loan_requests ADD COLUMN broker_id VARCHAR(255) REFERENCES users(id);
    END IF;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loan_requests' AND column_name = 'referral_source'
  ) THEN
    ALTER TABLE loan_requests ADD COLUMN referral_source VARCHAR(100);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loan_requests' AND column_name = 'referral_fee_percentage'
  ) THEN
    ALTER TABLE loan_requests ADD COLUMN referral_fee_percentage DECIMAL(5,2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loan_requests' AND column_name = 'referral_fee_amount'
  ) THEN
    ALTER TABLE loan_requests ADD COLUMN referral_fee_amount DECIMAL(10,2);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'loan_requests' AND column_name = 'referral_paid'
  ) THEN
    ALTER TABLE loan_requests ADD COLUMN referral_paid BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Capital Sources / Lenders table
CREATE TABLE IF NOT EXISTS capital_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('direct_lender', 'private_fund', 'syndication_partner', 'rpc_balance_sheet', 'rpc_fund')),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  min_loan_amount DECIMAL(15,2),
  max_loan_amount DECIMAL(15,2),
  preferred_property_types TEXT[],
  preferred_geographies TEXT[],
  max_ltv DECIMAL(5,2),
  min_dscr DECIMAL(5,2),
  rate_range_min DECIMAL(5,3),
  rate_range_max DECIMAL(5,3),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Capital Routing table (tracks which deals go to which capital sources)
-- Note: foreign keys will be set based on actual table types
DO $$ 
DECLARE
  users_id_type VARCHAR;
  loans_id_type VARCHAR;
BEGIN
  SELECT data_type INTO users_id_type
  FROM information_schema.columns
  WHERE table_name = 'users' AND column_name = 'id';
  
  SELECT data_type INTO loans_id_type
  FROM information_schema.columns
  WHERE table_name = 'loan_requests' AND column_name = 'id';
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'capital_routing') THEN
    IF users_id_type = 'uuid' AND loans_id_type = 'uuid' THEN
      EXECUTE 'CREATE TABLE capital_routing (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        loan_id UUID REFERENCES loan_requests(id) ON DELETE CASCADE,
        capital_source_id UUID REFERENCES capital_sources(id),
        routed_by UUID REFERENCES users(id),
        routed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT ''pending'' CHECK (status IN (''pending'', ''approved'', ''declined'', ''withdrawn'')),
        notes TEXT,
        response_received_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )';
    ELSIF users_id_type = 'character varying' AND loans_id_type = 'character varying' THEN
      EXECUTE 'CREATE TABLE capital_routing (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        loan_id VARCHAR(255) REFERENCES loan_requests(id) ON DELETE CASCADE,
        capital_source_id UUID REFERENCES capital_sources(id),
        routed_by VARCHAR(255) REFERENCES users(id),
        routed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT ''pending'' CHECK (status IN (''pending'', ''approved'', ''declined'', ''withdrawn'')),
        notes TEXT,
        response_received_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )';
    ELSE
      -- Mixed types - use VARCHAR for compatibility
      EXECUTE 'CREATE TABLE capital_routing (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        loan_id VARCHAR(255) REFERENCES loan_requests(id) ON DELETE CASCADE,
        capital_source_id UUID REFERENCES capital_sources(id),
        routed_by VARCHAR(255) REFERENCES users(id),
        routed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(50) DEFAULT ''pending'' CHECK (status IN (''pending'', ''approved'', ''declined'', ''withdrawn'')),
        notes TEXT,
        response_received_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )';
    END IF;
  END IF;
END $$;

-- Lender Performance tracking
CREATE TABLE IF NOT EXISTS lender_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capital_source_id UUID REFERENCES capital_sources(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  deals_submitted INTEGER DEFAULT 0,
  deals_approved INTEGER DEFAULT 0,
  deals_declined INTEGER DEFAULT 0,
  deals_funded INTEGER DEFAULT 0,
  total_volume_submitted DECIMAL(15,2) DEFAULT 0,
  total_volume_approved DECIMAL(15,2) DEFAULT 0,
  total_volume_funded DECIMAL(15,2) DEFAULT 0,
  avg_response_time_days DECIMAL(5,2),
  approval_rate DECIMAL(5,2),
  funding_rate DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_loans_broker ON loan_requests(broker_id);
CREATE INDEX IF NOT EXISTS idx_capital_routing_loan ON capital_routing(loan_id);
CREATE INDEX IF NOT EXISTS idx_capital_routing_source ON capital_routing(capital_source_id);
CREATE INDEX IF NOT EXISTS idx_capital_routing_status ON capital_routing(status);
CREATE INDEX IF NOT EXISTS idx_lender_performance_source ON lender_performance(capital_source_id);
CREATE INDEX IF NOT EXISTS idx_lender_performance_period ON lender_performance(period_start, period_end);
`;

async function migrate() {
  try {
    console.log('🔄 Running broker and capital routing migrations...');
    await pool.query(migrations);
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();

