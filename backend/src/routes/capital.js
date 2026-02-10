const express = require('express');
const db = require('../db/config');
const { authenticate, requireOps } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// All routes require operations/admin
router.use(authenticate, requireOps);

// Get all capital sources
router.get('/sources', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT * FROM capital_sources
      WHERE is_active = true
      ORDER BY name
    `);

    res.json({ sources: result.rows });
  } catch (error) {
    next(error);
  }
});

// Create capital source
router.post('/sources', async (req, res, next) => {
  try {
    const {
      name, type, contactName, contactEmail, contactPhone,
      minLoanAmount, maxLoanAmount, preferredPropertyTypes,
      preferredGeographies, maxLtv, minDscr,
      rateRangeMin, rateRangeMax, notes
    } = req.body;

    const result = await db.query(`
      INSERT INTO capital_sources (
        name, type, contact_name, contact_email, contact_phone,
        min_loan_amount, max_loan_amount, preferred_property_types,
        preferred_geographies, max_ltv, min_dscr,
        rate_range_min, rate_range_max, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      name, type, contactName, contactEmail, contactPhone,
      minLoanAmount, maxLoanAmount, preferredPropertyTypes || [],
      preferredGeographies || [], maxLtv, minDscr,
      rateRangeMin, rateRangeMax, notes
    ]);

    await logAudit(req.user.id, 'CAPITAL_SOURCE_CREATED', 'capital_source', result.rows[0].id, req);

    res.json({ source: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update capital source
router.put('/sources/:id', async (req, res, next) => {
  try {
    const {
      name, type, contactName, contactEmail, contactPhone,
      minLoanAmount, maxLoanAmount, preferredPropertyTypes,
      preferredGeographies, maxLtv, minDscr,
      rateRangeMin, rateRangeMax, isActive, notes
    } = req.body;

    const result = await db.query(`
      UPDATE capital_sources SET
        name = COALESCE($1, name),
        type = COALESCE($2, type),
        contact_name = COALESCE($3, contact_name),
        contact_email = COALESCE($4, contact_email),
        contact_phone = COALESCE($5, contact_phone),
        min_loan_amount = COALESCE($6, min_loan_amount),
        max_loan_amount = COALESCE($7, max_loan_amount),
        preferred_property_types = COALESCE($8, preferred_property_types),
        preferred_geographies = COALESCE($9, preferred_geographies),
        max_ltv = COALESCE($10, max_ltv),
        min_dscr = COALESCE($11, min_dscr),
        rate_range_min = COALESCE($12, rate_range_min),
        rate_range_max = COALESCE($13, rate_range_max),
        is_active = COALESCE($14, is_active),
        notes = COALESCE($15, notes),
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `, [
      name, type, contactName, contactEmail, contactPhone,
      minLoanAmount, maxLoanAmount, preferredPropertyTypes,
      preferredGeographies, maxLtv, minDscr,
      rateRangeMin, rateRangeMax, isActive, notes,
      req.params.id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Capital source not found' });
    }

    await logAudit(req.user.id, 'CAPITAL_SOURCE_UPDATED', 'capital_source', req.params.id, req);

    res.json({ source: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Route loan to capital source
router.post('/route-loan', async (req, res, next) => {
  try {
    const { loanId, capitalSourceId, notes } = req.body;

    // Verify loan exists
    const loan = await db.query('SELECT * FROM loan_requests WHERE id = $1', [loanId]);
    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Verify capital source exists
    const source = await db.query('SELECT * FROM capital_sources WHERE id = $1', [capitalSourceId]);
    if (source.rows.length === 0) {
      return res.status(404).json({ error: 'Capital source not found' });
    }

    // Create routing record
    const result = await db.query(`
      INSERT INTO capital_routing (loan_id, capital_source_id, routed_by, notes)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [loanId, capitalSourceId, req.user.id, notes]);

    await logAudit(req.user.id, 'LOAN_ROUTED', 'loan', loanId, req, {
      capitalSourceId,
      capitalSourceName: source.rows[0].name
    });

    res.json({ routing: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get routing history for a loan
router.get('/loan/:loanId/routing', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT 
        cr.*,
        cs.name as capital_source_name,
        cs.type as capital_source_type,
        u.full_name as routed_by_name
      FROM capital_routing cr
      LEFT JOIN capital_sources cs ON cr.capital_source_id = cs.id
      LEFT JOIN users u ON cr.routed_by = u.id
      WHERE cr.loan_id = $1
      ORDER BY cr.routed_at DESC
    `, [req.params.loanId]);

    res.json({ routing: result.rows });
  } catch (error) {
    next(error);
  }
});

// Update routing status
router.put('/routing/:id/status', async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    const result = await db.query(`
      UPDATE capital_routing
      SET status = $1, notes = COALESCE($2, notes), response_received_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, notes, req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Routing not found' });
    }

    await logAudit(req.user.id, 'ROUTING_STATUS_UPDATED', 'capital_routing', req.params.id, req, { status });

    res.json({ routing: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Get lender performance metrics
router.get('/performance', async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    
    let periodStart, periodEnd;
    if (period === 'month') {
      periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      periodEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    } else if (period === 'quarter') {
      const quarter = Math.floor(new Date().getMonth() / 3);
      periodStart = new Date(new Date().getFullYear(), quarter * 3, 1);
      periodEnd = new Date(new Date().getFullYear(), (quarter + 1) * 3, 0);
    } else {
      periodStart = new Date(new Date().getFullYear(), 0, 1);
      periodEnd = new Date(new Date().getFullYear(), 11, 31);
    }

    // Calculate performance metrics
    const performance = await db.query(`
      SELECT 
        cs.id,
        cs.name,
        cs.type,
        COUNT(DISTINCT cr.loan_id) as deals_submitted,
        COUNT(DISTINCT CASE WHEN cr.status = 'approved' THEN cr.loan_id END) as deals_approved,
        COUNT(DISTINCT CASE WHEN cr.status = 'declined' THEN cr.loan_id END) as deals_declined,
        COUNT(DISTINCT CASE WHEN lr.status = 'funded' AND cr.status = 'approved' THEN lr.id END) as deals_funded,
        AVG(EXTRACT(EPOCH FROM (cr.response_received_at - cr.routed_at)) / 86400) as avg_response_days,
        CASE 
          WHEN COUNT(DISTINCT cr.loan_id) > 0 
          THEN (COUNT(DISTINCT CASE WHEN cr.status = 'approved' THEN cr.loan_id END)::DECIMAL / COUNT(DISTINCT cr.loan_id) * 100)
          ELSE 0 
        END as approval_rate,
        CASE 
          WHEN COUNT(DISTINCT CASE WHEN cr.status = 'approved' THEN cr.loan_id END) > 0
          THEN (COUNT(DISTINCT CASE WHEN lr.status = 'funded' AND cr.status = 'approved' THEN lr.id END)::DECIMAL / COUNT(DISTINCT CASE WHEN cr.status = 'approved' THEN cr.loan_id END) * 100)
          ELSE 0
        END as funding_rate
      FROM capital_sources cs
      LEFT JOIN capital_routing cr ON cs.id = cr.capital_source_id
        AND cr.routed_at >= $1
        AND cr.routed_at <= $2
      LEFT JOIN loan_requests lr ON cr.loan_id = lr.id
      WHERE cs.is_active = true
      GROUP BY cs.id, cs.name, cs.type
      ORDER BY deals_submitted DESC
    `, [periodStart, periodEnd]);

    res.json({ performance: performance.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

