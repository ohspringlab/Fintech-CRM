require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./config');

async function seed() {
  try {
    console.log('Seeding database...');

    // Create demo admin user
    // Use environment variables with fallback to default (development only)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@rpc-lending.com';
    const adminPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'admin123456', 
      12
    );
    await pool.query(`
      INSERT INTO users (email, password_hash, full_name, phone, role, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, [adminEmail, adminPassword, 'Admin User', '555-000-0000', 'admin', true]);

    // Create demo operations user
    const opsPassword = await bcrypt.hash('ops123456', 12);
    await pool.query(`
      INSERT INTO users (email, password_hash, full_name, phone, role, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, ['ops@rpc-lending.com', opsPassword, 'Sarah Martinez', '555-000-0001', 'operations', true]);

    // Create demo borrower
    const borrowerPassword = await bcrypt.hash('demo123456', 12);
    const borrowerResult = await pool.query(`
      INSERT INTO users (email, password_hash, full_name, phone, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
      RETURNING id
    `, ['demo@example.com', borrowerPassword, 'John Smith', '555-123-4567', 'borrower']);

    const borrowerId = borrowerResult.rows[0]?.id;

    if (borrowerId) {
      // Create CRM profile
      await pool.query(`
        INSERT INTO crm_profiles (user_id, city, state, zip_code, credit_score, fico_score)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [borrowerId, 'Los Angeles', 'CA', '90001', 720, 720]);

      // Create sample loan request - DSCR Rental
      const loan1 = await pool.query(`
        INSERT INTO loan_requests (
          user_id, loan_number, property_address, property_city, property_state, property_zip,
          property_type, residential_units, request_type, transaction_type, borrower_type,
          property_value, requested_ltv, loan_amount, documentation_type, 
          annual_rental_income, annual_operating_expenses, noi, annual_loan_payments, dscr_ratio,
          status, current_step, soft_quote_generated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (loan_number) DO NOTHING
        RETURNING id
      `, [
        borrowerId, 'RPC-2024-0001', '123 Main Street', 'Los Angeles', 'CA', '90001',
        'residential', 4, 'purchase', 'dscr_rental', 'investment',
        750000, 75.00, 562500, 'full_doc',
        96000, 24000, 72000, 58500, 1.23,
        'needs_list_sent', 6, true
      ]);

      // Add needs list items for loan 1
      if (loan1.rows[0]?.id) {
        const needsItems = [
          { type: 'Government ID', folder: 'identification', desc: 'Valid government-issued photo ID' },
          { type: 'Entity Documents', folder: 'entity_docs', desc: 'LLC/Corp documents, Operating Agreement' },
          { type: 'Bank Statements', folder: 'bank_statements', desc: 'Last 2 months bank statements' },
          { type: 'Lease Agreements', folder: 'property_docs', desc: 'Current lease agreements for all units' },
          { type: 'Rent Roll', folder: 'property_docs', desc: 'Current rent roll showing all tenants' },
        ];

        for (const item of needsItems) {
          await pool.query(`
            INSERT INTO needs_list_items (loan_id, document_type, folder_name, description, status, is_required)
            VALUES ($1, $2, $3, $4, 'pending', true)
          `, [loan1.rows[0].id, item.type, item.folder, item.desc]);
        }

        // Add status history
        await pool.query(`
          INSERT INTO loan_status_history (loan_id, status, step, changed_by, notes)
          VALUES ($1, 'needs_list_sent', 6, $2, 'Needs list sent to borrower')
        `, [loan1.rows[0].id, borrowerId]);
      }

      // Create second loan - Fix & Flip
      await pool.query(`
        INSERT INTO loan_requests (
          user_id, loan_number, property_address, property_city, property_state, property_zip,
          property_type, residential_units, request_type, transaction_type, borrower_type,
          property_value, requested_ltv, loan_amount, documentation_type,
          status, current_step
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (loan_number) DO NOTHING
      `, [
        borrowerId, 'RPC-2024-0002', '456 Oak Avenue', 'Miami', 'FL', '33101',
        'residential', 1, 'purchase', 'fix_flip', 'investment',
        450000, 80.00, 360000, 'light_doc',
        'submitted_to_underwriting', 8
      ]);
    }

    console.log('✅ Seed data created successfully');
    console.log('\nDemo Accounts:');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@rpc-lending.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
    console.log('  Operations: ops@rpc-lending.com / ops123456');
    console.log('  Borrower: demo@example.com / demo123456');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
