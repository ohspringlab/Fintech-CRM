const db = require('../db/config');
const { v4: uuidv4 } = require('uuid');

const logAudit = async (userId, action, entityType, entityId, req, details = {}) => {
  try {
    // Check if audit_logs table exists
    const tableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'audit_logs'
    `);
    
    if (tableCheck.rows.length === 0) {
      // Table doesn't exist, skip audit logging
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Audit] audit_logs table does not exist, skipping audit log');
      }
      return;
    }
    
    // Generate an ID for the audit log entry
    const auditId = uuidv4();
    
    await db.query(`
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, ip_address, user_agent, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      auditId,
      userId,
      action,
      entityType,
      entityId,
      req.ip || req.connection?.remoteAddress,
      req.headers['user-agent'],
      JSON.stringify(details)
    ]);
  } catch (error) {
    // Don't log error in production to avoid noise, but log in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Audit log failed:', error.message);
    }
  }
};

module.exports = { logAudit };
