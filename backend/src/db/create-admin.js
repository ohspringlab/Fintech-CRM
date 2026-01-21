require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./config');

async function createAdmin() {
  try {
    // Use environment variables with fallback to default (development only)
    const email = process.env.ADMIN_EMAIL || 'admin@rpc-lending.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123456';
    
    if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
      console.error('❌ ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be set in production!');
      process.exit(1);
    }
    
    const passwordHash = await bcrypt.hash(password, 12);

    console.log('Creating admin user...');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

    const result = await pool.query(`
      INSERT INTO users (email, password_hash, full_name, phone, role, email_verified, is_active)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        email_verified = NOW(),
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING id, email, full_name, role, email_verified, is_active
    `, [email, passwordHash, 'Admin User', '555-000-0000', 'admin', true]);

    if (result.rows.length > 0) {
      console.log('\n✅ Admin user created/updated successfully!');
      console.log(`   ID: ${result.rows[0].id}`);
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Role: ${result.rows[0].role}`);
      console.log(`   Email Verified: ${result.rows[0].email_verified}`);
      console.log(`   Active: ${result.rows[0].is_active}`);
      console.log(`\n   Login credentials:`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    } else {
      console.log('⚠️  No user returned (might already exist)');
    }

    // Verify the user exists
    const verify = await pool.query('SELECT email, role, is_active, email_verified FROM users WHERE email = $1', [email]);
    if (verify.rows.length > 0) {
      console.log('\n✅ Verification: User exists in database');
      console.log(verify.rows[0]);
    } else {
      console.log('\n❌ Verification failed: User not found');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create admin:', error);
    process.exit(1);
  }
}

createAdmin();

