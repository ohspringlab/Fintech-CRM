// Support both PostgreSQL and SQLite
// This is a copy of backend/src/db/config.js for use in Vercel serverless functions
const databaseUrl = process.env.DATABASE_URL || '';
const isSQLite = databaseUrl.startsWith('sqlite:');

console.log('📦 [DB Config] Initializing database connection:', {
  hasDatabaseUrl: !!databaseUrl,
  databaseUrlPrefix: databaseUrl ? databaseUrl.substring(0, 20) + '...' : 'none',
  isSQLite,
  nodeEnv: process.env.NODE_ENV,
});

let db;

if (isSQLite) {
  // SQLite configuration
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  
  const dbPath = databaseUrl.replace('sqlite:', '');
  // In serverless, we need to resolve from the project root
  const dbFile = path.resolve(process.cwd(), dbPath);
  
  console.log('📦 [DB Config] SQLite database path:', dbFile);
  db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
      console.error('❌ [DB Config] SQLite connection error:', err);
      console.error('❌ [DB Config] Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack,
      });
    } else {
      console.log('✅ [DB Config] Connected to SQLite database:', dbFile);
    }
  });

  // Wrap SQLite to work like pg's interface
  const query = (text, params) => {
    return new Promise((resolve, reject) => {
      // Convert PostgreSQL-style placeholders ($1, $2) to SQLite (?, ?)
      const sqliteQuery = text.replace(/\$(\d+)/g, '?');
      
      if (text.trim().toUpperCase().startsWith('SELECT')) {
        db.all(sqliteQuery, params || [], (err, rows) => {
          if (err) reject(err);
          else resolve({ rows, rowCount: rows.length });
        });
      } else if (text.includes('RETURNING')) {
        // Handle INSERT/UPDATE with RETURNING clause
        // Extract the table name and RETURNING columns
        const insertMatch = text.match(/INSERT INTO (\w+)/i);
        const updateMatch = text.match(/UPDATE (\w+)/i);
        const tableName = insertMatch ? insertMatch[1] : updateMatch ? updateMatch[1] : null;
        
        // Remove RETURNING clause for SQLite
        const queryWithoutReturning = sqliteQuery.replace(/RETURNING.*/i, '');
        
        db.run(queryWithoutReturning, params || [], function(err) {
          if (err) {
            reject(err);
          } else {
            // Fetch the inserted/updated row
            if (tableName && this.lastID) {
              db.get(`SELECT * FROM ${tableName} WHERE rowid = ?`, [this.lastID], (err, row) => {
                if (err) reject(err);
                else resolve({ rows: row ? [row] : [], rowCount: this.changes });
              });
            } else if (tableName && params && params[0]) {
              // For UPDATE, use the ID from params (usually first param)
              db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [params[0]], (err, row) => {
                if (err) reject(err);
                else resolve({ rows: row ? [row] : [], rowCount: this.changes });
              });
            } else {
              resolve({ rows: [], rowCount: this.changes, lastID: this.lastID });
            }
          }
        });
      } else {
        db.run(sqliteQuery, params || [], function(err) {
          if (err) reject(err);
          else resolve({ rows: [], rowCount: this.changes, lastID: this.lastID });
        });
      }
    });
  };

  module.exports = { query, pool: db, db };
  
} else {
  // PostgreSQL configuration
  console.log('📦 [DB Config] Initializing PostgreSQL connection pool...');
  const { Pool } = require('pg');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (err) => {
    console.error('❌ [DB Config] Unexpected database pool error:', err);
    console.error('❌ [DB Config] Error details:', {
      message: err.message,
      code: err.code,
      stack: err.stack,
    });
  });

  pool.on('connect', () => {
    console.log('✅ [DB Config] PostgreSQL connection established');
  });

  console.log('✅ [DB Config] PostgreSQL connection pool created');

  module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
  };
}

