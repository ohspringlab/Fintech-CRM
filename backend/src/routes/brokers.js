const express = require('express');
const db = require('../db/config');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get broker's referred loans
router.get('/my-loans', requireRole(['broker', 'admin']), async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT lr.*, u.full_name as borrower_name, u.email as borrower_email
      FROM loan_requests lr
      LEFT JOIN users u ON lr.user_id = u.id
      WHERE lr.broker_id = $1
      ORDER BY lr.created_at DESC
    `, [req.user.id]);

    res.json({ loans: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get broker dashboard stats
router.get('/stats', requireRole(['broker', 'admin']), async (req, res, next) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_loans,
        COUNT(CASE WHEN status = 'funded' THEN 1 END) as funded_loans,
        SUM(CASE WHEN status = 'funded' THEN loan_amount ELSE 0 END) as total_volume,
        SUM(CASE WHEN status = 'funded' THEN referral_fee_amount ELSE 0 END) as total_fees_earned,
        SUM(CASE WHEN referral_paid = true THEN referral_fee_amount ELSE 0 END) as fees_paid
      FROM loan_requests
      WHERE broker_id = $1
    `, [req.user.id]);

    res.json({ stats: stats.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

