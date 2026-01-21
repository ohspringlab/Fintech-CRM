require('dotenv').config();
const { pool } = require('./config');

async function createEmailVerificationTable() {
  try {
    console.log('Creating email_verification_tokens table...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'email_verification_tokens'
      )
    `);
    
    if (tableExists.rows[0].exists) {
      console.log('✅ email_verification_tokens table already exists');
      process.exit(0);
      return;
    }
    
    // Check the id type used in users table
    const idTypeResult = await pool.query(`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    const idType = idTypeResult.rows[0]?.data_type === 'uuid' ? 'UUID' : 'VARCHAR(255)';
    
    await pool.query(`
      CREATE TABLE email_verification_tokens (
        user_id ${idType} PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Successfully created email_verification_tokens table');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create email_verification_tokens table:', error.message);
    process.exit(1);
  }
}

createEmailVerificationTable();


