require('dotenv').config();
const { pool } = require('./config');

async function checkUsersTable() {
  try {
    const result = await pool.query(`
      SELECT 
        column_name, 
        data_type, 
        character_maximum_length,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    console.log('Users table structure:');
    console.table(result.rows);
    
    // Check the id column specifically
    const idColumn = result.rows.find(r => r.column_name === 'id');
    if (idColumn) {
      console.log(`\nID column type: ${idColumn.data_type}`);
      if (idColumn.character_maximum_length) {
        console.log(`ID column length: ${idColumn.character_maximum_length}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsersTable();



