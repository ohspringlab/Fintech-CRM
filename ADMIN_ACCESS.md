# Admin Page Access Guide

## How to Access the Admin Page

### Option 1: Using the Seeded Admin Account (Recommended)

1. **Run the seed script** to create demo accounts:
   ```bash
   cd backend
   node src/db/seed.js
   ```

2. **Login with admin credentials**:
   - **Email**: `admin@rpc-lending.com`
   - **Password**: `admin123456`
   - **URL**: `http://localhost:8080/login` (or your frontend URL)

3. **Automatic Redirect**: After login, admin users are automatically redirected to `/admin`

### Option 2: Create Admin User Manually via SQL

If you need to create an admin user directly in the database:

```sql
-- Hash password: 'admin123456' (use bcrypt with 12 rounds)
-- You can use Node.js to generate the hash:
-- const bcrypt = require('bcryptjs');
-- const hash = await bcrypt.hash('admin123456', 12);
-- console.log(hash);

INSERT INTO users (email, password_hash, full_name, phone, role, email_verified, is_active)
VALUES (
  'admin@rpc-lending.com',
  '$2a$12$YOUR_HASHED_PASSWORD_HERE',  -- Replace with actual bcrypt hash
  'Admin User',
  '555-000-0000',
  'admin',
  true,
  true
);
```

### Option 3: Create Admin User via Node.js Script

Create a file `backend/src/db/create-admin.js`:

```javascript
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./config');

async function createAdmin() {
  try {
    const email = 'admin@rpc-lending.com';
    const password = 'admin123456';
    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(`
      INSERT INTO users (email, password_hash, full_name, phone, role, email_verified, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role,
        email_verified = EXCLUDED.email_verified
      RETURNING id, email, full_name, role
    `, [email, passwordHash, 'Admin User', '555-000-0000', 'admin', true, true]);

    console.log('✅ Admin user created/updated:');
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${result.rows[0].role}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create admin:', error);
    process.exit(1);
  }
}

createAdmin();
```

Run it:
```bash
cd backend
node src/db/create-admin.js
```

## Admin Page Features

Once logged in as admin, you'll have access to:

1. **Admin Dashboard** (`/admin`)
   - Pipeline metrics (Value, Open Deals, Win Rate, Won This Month)
   - Pipeline Profit tracking
   - Pipeline Forecast
   - Needs Attention section
   - Recent Activity feed

2. **Recent Closings Tab**
   - Auto-updating list of funded loans
   - Shows loan details, borrower info, property info
   - Refreshes every 30 seconds automatically

3. **Full Access** to all operations features:
   - View all loans
   - Update loan status
   - Assign processors
   - Review documents
   - Manage needs lists

## Role-Based Access

- **Admin** (`role = 'admin'`) → Redirected to `/admin`
- **Operations** (`role = 'operations'`) → Redirected to `/ops`
- **Borrower** (`role = 'borrower'`) → Redirected to `/dashboard`

## Troubleshooting

### Can't access admin page?

1. **Check user role**: Verify the user has `role = 'admin'` in the database
   ```sql
   SELECT email, role, is_active FROM users WHERE email = 'your-email@example.com';
   ```

2. **Check email verification**: Admin users should have `email_verified = true`
   ```sql
   UPDATE users SET email_verified = true WHERE email = 'admin@rpc-lending.com';
   ```

3. **Check account status**: Ensure `is_active = true`
   ```sql
   UPDATE users SET is_active = true WHERE email = 'admin@rpc-lending.com';
   ```

4. **Clear browser cache**: Logout and login again

5. **Check route protection**: Ensure you're accessing `/admin` (not `/ops`)

## Direct URL Access

If you're already logged in as admin, you can directly navigate to:
- `http://localhost:8080/admin` - Admin Dashboard
- `http://localhost:8080/admin?tab=closings` - Recent Closings tab


