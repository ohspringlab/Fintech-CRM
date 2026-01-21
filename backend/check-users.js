// Check users table and role column
const db = require('./src/db/config');

async function checkUsersTable() {
  try {
    // Check role column configuration
    const columnInfo = await db.query(`
      SELECT column_name, column_default, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'role'
    `);
    
    console.log('\n📋 Role Column Configuration:');
    console.log(JSON.stringify(columnInfo.rows, null, 2));
    
    // Check recent users
    const users = await db.query(`
      SELECT id, email, role, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n👥 Recent Users:');
    console.table(users.rows);
    
    await db.pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsersTable();
