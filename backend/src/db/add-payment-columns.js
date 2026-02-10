require('dotenv').config();
const { pool } = require('./config');

async function addPaymentColumns() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add application fee columns
    const appFeeCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'loan_requests' AND column_name = 'application_fee_paid'
    `);
    
    if (appFeeCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE loan_requests 
        ADD COLUMN application_fee_paid BOOLEAN DEFAULT false,
        ADD COLUMN application_fee_payment_id VARCHAR(255),
        ADD COLUMN application_fee_amount DECIMAL(10,2)
      `);
      console.log('✅ Added application_fee columns');
    } else {
      console.log('✓ application_fee columns already exist');
    }

    // Add underwriting fee columns
    const uwFeeCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'loan_requests' AND column_name = 'underwriting_fee_paid'
    `);
    
    if (uwFeeCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE loan_requests 
        ADD COLUMN underwriting_fee_paid BOOLEAN DEFAULT false,
        ADD COLUMN underwriting_fee_payment_id VARCHAR(255),
        ADD COLUMN underwriting_fee_amount DECIMAL(10,2)
      `);
      console.log('✅ Added underwriting_fee columns');
    } else {
      console.log('✓ underwriting_fee columns already exist');
    }

    // Add closing fee columns
    const closingFeeCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'loan_requests' AND column_name = 'closing_fee_paid'
    `);
    
    if (closingFeeCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE loan_requests 
        ADD COLUMN closing_fee_paid BOOLEAN DEFAULT false,
        ADD COLUMN closing_fee_payment_id VARCHAR(255),
        ADD COLUMN closing_fee_amount DECIMAL(10,2)
      `);
      console.log('✅ Added closing_fee columns');
    } else {
      console.log('✓ closing_fee columns already exist');
    }

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addPaymentColumns()
  .then(() => {
    console.log('Done');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });


