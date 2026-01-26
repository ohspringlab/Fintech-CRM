require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./config');
const { createClerkClient } = require('@clerk/backend');

async function addAdmin() {
  try {
    console.log('🔐 Adding Admin User\n');
    
    // Get email and password from command line arguments or use defaults
    const email = process.argv[2] || 'jf@riversideparkcapital.com';
    const password = process.argv[3] || 'MainAdmin123!';
    const fullName = process.argv[4] || email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' Admin';
    
    if (!email || !password) {
      console.error('❌ Email and password are required');
      console.error('   Usage: node add-admin.js <email> <password> [fullName]');
      process.exit(1);
    }
    
    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
      process.exit(1);
    }
    
    // Hash password for database
    const passwordHash = await bcrypt.hash(password, 12);
    
    console.log('📧 Email:', email);
    console.log('👤 Name:', fullName);
    console.log('🔑 Password:', password);
    console.log('');
    
    // Check if user already exists in database
    const existingUser = await pool.query(
      'SELECT id, email, role FROM users WHERE LOWER(TRIM(email)) = $1',
      [email.toLowerCase().trim()]
    );
    
    let userId;
    
    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists in database. Updating to admin...');
      userId = existingUser.rows[0].id;
      
      await pool.query(`
        UPDATE users SET
          password_hash = $1,
          full_name = COALESCE($2, full_name),
          role = 'admin',
          email_verified = true,
          is_active = true,
          updated_at = NOW()
        WHERE id = $3
      `, [passwordHash, fullName, userId]);
      
      console.log('✅ User updated in database');
    } else {
      console.log('📝 Creating user in database...');
      
      // Check if users table uses UUID or VARCHAR for id
      const idTypeResult = await pool.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'id'
      `);
      const isUuid = idTypeResult.rows[0]?.data_type === 'uuid';
      
      // Check email_verified column type
      const emailVerifiedType = await pool.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_verified'
      `);
      const isEmailVerifiedBoolean = emailVerifiedType.rows[0]?.data_type === 'boolean';
      
      if (isUuid) {
        const query = isEmailVerifiedBoolean
          ? `INSERT INTO users (email, password_hash, full_name, phone, role, email_verified, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, email, full_name, role`
          : `INSERT INTO users (email, password_hash, full_name, phone, role, email_verified, is_active)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6)
             RETURNING id, email, full_name, role`;
        
        const params = isEmailVerifiedBoolean
          ? [email, passwordHash, fullName, '000-000-0000', 'admin', true, true]
          : [email, passwordHash, fullName, '000-000-0000', 'admin', true];
        
        const result = await pool.query(query, params);
        userId = result.rows[0].id;
      } else {
        // For VARCHAR id type
        const uuid = require('uuid').v4();
        const query = isEmailVerifiedBoolean
          ? `INSERT INTO users (id, email, password_hash, full_name, phone, role, email_verified, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, email, full_name, role`
          : `INSERT INTO users (id, email, password_hash, full_name, phone, role, email_verified, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
             RETURNING id, email, full_name, role`;
        
        const params = isEmailVerifiedBoolean
          ? [uuid, email, passwordHash, fullName, '000-000-0000', 'admin', true, true]
          : [uuid, email, passwordHash, fullName, '000-000-0000', 'admin', true];
        
        const result = await pool.query(query, params);
        userId = result.rows[0].id;
      }
      
      console.log('✅ User created in database');
      console.log(`   ID: ${userId}`);
    }
    
    // Create user in Clerk if Clerk is configured
    if (process.env.CLERK_SECRET_KEY) {
      console.log('\n🔐 Creating/updating user in Clerk...');
      
      try {
        const clerkClient = createClerkClient({
          secretKey: process.env.CLERK_SECRET_KEY
        });
        
        // Check if user exists in Clerk
        const clerkUsers = await clerkClient.users.getUserList({
          emailAddress: [email.toLowerCase().trim()]
        });
        
        if (clerkUsers.data.length > 0) {
          console.log('⚠️  User already exists in Clerk. Updating...');
          const clerkUser = clerkUsers.data[0];
          
          await clerkClient.users.updateUser(clerkUser.id, {
            password: password,
            skipPasswordChecks: false
          });
          
          console.log('✅ User updated in Clerk');
          console.log(`   Clerk ID: ${clerkUser.id}`);
        } else {
          console.log('📝 Creating new user in Clerk...');
          
          const clerkUser = await clerkClient.users.createUser({
            emailAddress: [email],
            password: password,
            skipPasswordChecks: false,
            skipPasswordRequirement: false
          });
          
          console.log('✅ User created in Clerk');
          console.log(`   Clerk ID: ${clerkUser.id}`);
        }
      } catch (clerkError) {
        console.error('❌ Failed to create/update user in Clerk:', clerkError.message);
        if (clerkError.errors) {
          clerkError.errors.forEach(err => {
            console.error(`   - ${err.message}`);
          });
        }
        console.log('\n⚠️  User created in database but Clerk operation failed.');
        console.log('   You may need to sign up through Clerk UI or fix Clerk configuration.');
      }
    } else {
      console.log('\n⚠️  CLERK_SECRET_KEY not configured. Skipping Clerk user creation.');
      console.log('   User created in database only.');
    }
    
    // Verify the user
    const verify = await pool.query(
      'SELECT id, email, full_name, role, email_verified, is_active FROM users WHERE id = $1',
      [userId]
    );
    
    if (verify.rows.length > 0) {
      console.log('\n✅ Verification: User exists in database');
      console.log('   Details:');
      console.log(`   ID: ${verify.rows[0].id}`);
      console.log(`   Email: ${verify.rows[0].email}`);
      console.log(`   Name: ${verify.rows[0].full_name}`);
      console.log(`   Role: ${verify.rows[0].role}`);
      console.log(`   Email Verified: ${verify.rows[0].email_verified}`);
      console.log(`   Active: ${verify.rows[0].is_active}`);
    }
    
    console.log('\n✅ Admin user setup complete!');
    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin\n`);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create admin user:', error.message);
    if (error.errors) {
      error.errors.forEach(err => {
        console.error(`   - ${err.message}`);
      });
    }
    console.error(error);
    process.exit(1);
  }
}

addAdmin();

