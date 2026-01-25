const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/config');
const { requireClerkAuth, requireClerkOps } = require('../middleware/clerkAuth');
const { logAudit } = require('../middleware/audit');
const { notifyOpsDocumentUpload } = require('../services/emailService');

const router = express.Router();

// All routes require operations role
router.use(requireClerkAuth, requireClerkOps);

// Status options for dropdown
const STATUS_OPTIONS = [
  { value: 'new_request', label: 'New Request', step: 1 },
  { value: 'quote_requested', label: 'Quote Requested', step: 2 },
  { value: 'soft_quote_issued', label: 'Soft Quote Issued', step: 3 },
  { value: 'term_sheet_issued', label: 'Term Sheet Issued', step: 4 },
  { value: 'term_sheet_signed', label: 'Term Sheet Signed', step: 5 },
  { value: 'needs_list_sent', label: 'Needs List Sent', step: 6 },
  { value: 'needs_list_complete', label: 'Needs List Complete', step: 7 },
  { value: 'submitted_to_underwriting', label: 'Submitted to Underwriting', step: 8 },
  { value: 'appraisal_ordered', label: 'Appraisal Ordered', step: 9 },
  { value: 'appraisal_received', label: 'Appraisal Received', step: 10 },
  { value: 'conditionally_approved', label: 'Conditionally Approved', step: 11 },
  { value: 'conditional_items_needed', label: 'Conditional Items Needed', step: 11 },
  { value: 'conditional_commitment_issued', label: 'Conditional Commitment Issued', step: 12 },
  { value: 'clear_to_close', label: 'Clear to Close', step: 13 },
  { value: 'closing_scheduled', label: 'Closing Scheduled', step: 14 },
  { value: 'funded', label: 'Funded', step: 15 }
];

// Get status options
router.get('/status-options', (req, res) => {
  res.json({ statuses: STATUS_OPTIONS });
});

// Get pipeline overview
router.get('/pipeline', async (req, res, next) => {
  try {
    const { status, search, processor, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT lr.*, 
             u.id as borrower_id,
             u.full_name as borrower_name, 
             u.email as borrower_email, 
             u.phone as borrower_phone,
             p.full_name as processor_name,
             (SELECT COUNT(*) FROM documents d WHERE d.loan_id = lr.id) as document_count,
             (SELECT COUNT(*) FROM needs_list_items nli WHERE nli.loan_id = lr.id AND nli.status = 'pending') as pending_docs,
             (SELECT MAX(uploaded_at::timestamp) FROM documents d WHERE d.loan_id = lr.id) as last_upload,
             EXTRACT(DAY FROM NOW() - (lr.updated_at::timestamp)) as days_in_status
      FROM loan_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN users p ON lr.assigned_processor_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND lr.status = $${params.length}`;
    }

    if (processor) {
      params.push(processor);
      query += ` AND lr.assigned_processor_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (lr.loan_number ILIKE $${params.length} OR u.full_name ILIKE $${params.length} OR lr.property_address ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    query += ` ORDER BY lr.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM loan_requests lr JOIN users u ON lr.user_id = u.id WHERE 1=1';
    const countParams = [];
    if (status && status !== 'all') {
      countParams.push(status);
      countQuery += ` AND lr.status = $${countParams.length}`;
    }
    if (search) {
      countParams.push(`%${search}%`);
      countQuery += ` AND (lr.loan_number ILIKE $${countParams.length} OR u.full_name ILIKE $${countParams.length})`;
    }
    const countResult = await db.query(countQuery, countParams);

    res.json({
      loans: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      totalPages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (error) {
    next(error);
  }
});

// Get pipeline stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await db.query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(loan_amount) as total_amount
      FROM loan_requests
      GROUP BY status
    `);

    const totalLoans = await db.query('SELECT COUNT(*) FROM loan_requests');
    const totalFunded = await db.query(`
      SELECT COUNT(*), SUM(funded_amount) as amount 
      FROM loan_requests WHERE status = 'funded'
    `);

    // Get loans needing attention (stale > 3 days)
    const staleLoans = await db.query(`
      SELECT COUNT(*) FROM loan_requests 
      WHERE status NOT IN ('funded', 'clear_to_close', 'closing_scheduled')
      AND (updated_at::timestamp) < NOW() - INTERVAL '3 days'
    `);

    // Recent uploads (last 24 hours)
    // Cast uploaded_at to timestamp to handle cases where it might be stored as text
    const recentUploads = await db.query(`
      SELECT COUNT(*) FROM documents 
      WHERE (uploaded_at::timestamp) > NOW() - INTERVAL '24 hours'
    `);

    // This month's volume
    // Compare funded_date directly as DATE type
    const monthlyVolume = await db.query(`
      SELECT COUNT(*), SUM(funded_amount) as amount 
      FROM loan_requests 
      WHERE status = 'funded' 
      AND funded_date IS NOT NULL
      AND EXTRACT(YEAR FROM funded_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM funded_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    `);

    // Calculate profit metrics
    // Profit estimation: origination fees (1-1.5% of loan amount) + interest spread
    // For simplicity, using 2% of loan amount as estimated profit per loan
    const openLoans = await db.query(`
      SELECT 
        COUNT(*) as count,
        SUM(loan_amount) as total_amount,
        AVG(loan_amount) as avg_amount
      FROM loan_requests 
      WHERE status NOT IN ('funded', 'new_request')
    `);

    const fundedLoansProfit = await db.query(`
      SELECT 
        COUNT(*) as count,
        SUM(loan_amount * 0.02) as estimated_profit
      FROM loan_requests 
      WHERE status = 'funded' 
      AND funded_date IS NOT NULL
      AND EXTRACT(YEAR FROM funded_date) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM funded_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    `);

    // Calculate weighted profit (assuming 70% probability for active loans)
    const openLoansTotal = parseFloat(openLoans.rows[0]?.total_amount || 0) || 0;
    const weightedProfit = openLoansTotal * 0.02 * 0.7;

    // Get recent activity (new loans in last 7 days)
    const recentActivity = await db.query(`
      SELECT 
        lr.id,
        lr.loan_number,
        lr.status,
        lr.created_at,
        u.full_name as borrower_name,
        lr.property_address,
        lr.property_city,
        lr.property_state
      FROM loan_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE lr.created_at > NOW() - INTERVAL '7 days'
      ORDER BY lr.created_at DESC
      LIMIT 10
    `);

    // Get needs attention items
    const [pendingDocsRes, pendingQuotesRes] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM needs_list_items WHERE status = 'pending'`),
      db.query(`SELECT COUNT(*) FROM loan_requests WHERE status = 'quote_requested'`)
    ]);

    const pendingDocsCount = parseInt(pendingDocsRes.rows[0].count || 0);
    const pendingQuotesCount = parseInt(pendingQuotesRes.rows[0].count || 0);

    res.json({
      byStatus: stats.rows,
      totalLoans: parseInt(totalLoans.rows[0].count),
      fundedLoans: parseInt(totalFunded.rows[0].count || 0),
      fundedAmount: parseFloat(totalFunded.rows[0].amount || 0),
      staleLoans: parseInt(staleLoans.rows[0].count),
      recentUploads: parseInt(recentUploads.rows[0].count),
      monthlyFunded: parseInt(monthlyVolume.rows[0].count || 0),
      monthlyVolume: parseFloat(monthlyVolume.rows[0].amount || 0),
      // Profit metrics
      pipelineProfit: {
        totalPotential: openLoansTotal * 0.02,
        weightedProfit: weightedProfit,
        openDeals: parseInt(openLoans.rows[0]?.count || 0) || 0,
        avgProfitPerDeal: (parseFloat(openLoans.rows[0]?.avg_amount || 0) || 0) * 0.02,
        wonThisMonth: parseFloat(fundedLoansProfit.rows[0]?.estimated_profit || 0) || 0,
        dealsWonThisMonth: parseInt(fundedLoansProfit.rows[0]?.count || 0) || 0
      },
      // Forecast (simplified - based on open loans)
      forecast: {
        thisQuarter: weightedProfit * 3, // Estimate for quarter
        pipeline: openLoansTotal * 0.7, // Weighted pipeline value
        expectedProfit: weightedProfit
      },
      // Needs attention
      needsAttention: {
        staleLoans: parseInt(staleLoans.rows[0].count),
        pendingDocs: pendingDocsCount,
        pendingQuotes: pendingQuotesCount,
        total: parseInt(staleLoans.rows[0].count) + pendingDocsCount + pendingQuotesCount
      },
      // Recent activity
      recentActivity: recentActivity.rows.map(row => ({
        id: row.id,
        loanNumber: row.loan_number,
        type: 'new_loan',
        description: `New loan: ${row.borrower_name}`,
        timestamp: row.created_at,
        borrowerName: row.borrower_name,
        property: `${row.property_address}, ${row.property_city}, ${row.property_state}`
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get single loan (ops view) - can access borrower portal view
router.get('/loan/:id', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT lr.*, 
             u.id as borrower_id, u.full_name as borrower_name, u.email as borrower_email, u.phone as borrower_phone,
             cp.address_line1, cp.address_line2, cp.city as borrower_city, cp.state as borrower_state, 
             cp.zip_code as borrower_zip, cp.credit_score, cp.fico_score, cp.annual_income,
             p.full_name as processor_name
      FROM loan_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN crm_profiles cp ON u.id = cp.user_id
      LEFT JOIN users p ON lr.assigned_processor_id = p.id
      WHERE lr.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Get status history
    let history;
    try {
      history = await db.query(`
        SELECT lsh.*, u.full_name as changed_by_name
        FROM loan_status_history lsh
        LEFT JOIN users u ON lsh.changed_by = u.id
        WHERE lsh.loan_id = $1
        ORDER BY lsh.created_at DESC
      `, [req.params.id]);
    } catch (historyError) {
      console.error('Error fetching status history:', historyError.message);
      history = { rows: [] };
    }

    // Get needs list with folder colors
    let needsList;
    try {
      needsList = await db.query(`
        SELECT nli.*, 
               (SELECT COUNT(*) FROM documents d WHERE d.needs_list_item_id = nli.id) as document_count,
               (SELECT MAX(uploaded_at::timestamp) FROM documents d WHERE d.needs_list_item_id = nli.id) as last_upload
        FROM needs_list_items nli
        WHERE nli.loan_id = $1
        ORDER BY COALESCE(nli.folder_name, nli.category, ''), nli.created_at
      `, [req.params.id]);
    } catch (needsListError) {
      console.error('Error fetching needs list:', needsListError.message);
      needsList = { rows: [] };
    }

    // Add folder color status
    const needsListWithColors = needsList.rows.map(item => {
      let folderColor = 'tan'; // No documents
      if (item.document_count > 0) {
        folderColor = 'blue'; // Has documents
        if (item.last_upload && new Date(item.last_upload) > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
          folderColor = 'red'; // New upload in last 24 hours
        }
      }
      return { ...item, folder_color: folderColor };
    });

    // Get documents
    let documents;
    try {
      documents = await db.query(`
        SELECT d.*, 
               COALESCE(u.full_name, 'Unknown') as uploaded_by_name
        FROM documents d
        LEFT JOIN users u ON d.uploaded_by = u.id
        WHERE d.loan_id = $1 
        ORDER BY COALESCE(d.category, ''), d.uploaded_at DESC
      `, [req.params.id]);
    } catch (documentsError) {
      console.error('Error fetching documents:', documentsError.message);
      // Try simpler query without user join
      try {
        documents = await db.query(`
          SELECT d.*
          FROM documents d
          WHERE d.loan_id = $1 
          ORDER BY COALESCE(d.category, ''), d.uploaded_at DESC
        `, [req.params.id]);
        // Add uploaded_by_name as null
        documents.rows = documents.rows.map(doc => ({ ...doc, uploaded_by_name: null }));
      } catch (simpleDocError) {
        console.error('Simple documents query also failed:', simpleDocError.message);
        documents = { rows: [] };
      }
    }

    // Get payments
    let payments;
    try {
      payments = await db.query(`
        SELECT * FROM payments WHERE loan_id = $1 ORDER BY created_at DESC
      `, [req.params.id]);
    } catch (paymentsError) {
      console.error('Error fetching payments:', paymentsError.message);
      payments = { rows: [] };
    }

    res.json({
      loan: result.rows[0],
      statusHistory: history.rows,
      needsList: needsListWithColors,
      documents: documents.rows,
      payments: payments.rows,
      statusOptions: STATUS_OPTIONS
    });
  } catch (error) {
    next(error);
  }
});

// Update loan status (main ops action)
router.put('/loan/:id/status', [
  body('status').notEmpty(),
  body('notes').optional()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, notes } = req.body;

    // Find the step for this status
    const statusOption = STATUS_OPTIONS.find(s => s.value === status);
    const step = statusOption?.step || null;

    await db.query(`
      UPDATE loan_requests SET status = $1, current_step = COALESCE($2, current_step), updated_at = NOW()
      WHERE id = $3
    `, [status, step, req.params.id]);

    const statusHistoryId = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [statusHistoryId, req.params.id, status, step, req.user.id, notes]);

    // Create notification for borrower
    const loan = await db.query('SELECT user_id, loan_number FROM loan_requests WHERE id = $1', [req.params.id]);
    const statusLabel = statusOption?.label || status;
    
    const notificationId = require('uuid').v4();
    await db.query(`
      INSERT INTO notifications (id, user_id, loan_id, type, title, message)
      VALUES ($1, $2, $3, 'status_update', $4, $5)
    `, [notificationId, loan.rows[0].user_id, req.params.id, 'Loan Status Updated', `Your loan ${loan.rows[0].loan_number} status: ${statusLabel}`]);

    await logAudit(req.user.id, 'LOAN_STATUS_UPDATED', 'loan', req.params.id, req, { status, notes });

    res.json({ message: 'Status updated', newStatus: status, step });
  } catch (error) {
    next(error);
  }
});

// Approve quote request and generate quote
router.post('/loan/:id/approve-quote', async (req, res, next) => {
  try {
    const { generateSoftQuote, generateInitialNeedsListForLoan } = require('../services/quoteService');
    const { generateTermSheet } = require('../services/pdfService');
    const { sendSoftQuoteEmail } = require('../services/emailService');

    // Get loan details
    const loanResult = await db.query('SELECT * FROM loan_requests WHERE id = $1', [req.params.id]);
    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanResult.rows[0];

    // Check if loan is in quote_requested status
    if (loan.status !== 'quote_requested') {
      return res.status(400).json({ 
        error: `Loan is not in quote_requested status. Current status: ${loan.status}` 
      });
    }

    // Get borrower's credit score if available
    const profile = await db.query('SELECT credit_score, fico_score FROM crm_profiles WHERE user_id = $1', [loan.user_id]);
    const creditScore = profile.rows[0]?.fico_score || profile.rows[0]?.credit_score || null;

    // Generate soft quote
    const quoteData = generateSoftQuote(loan, creditScore);

    if (!quoteData.approved) {
      // If quote is not approved, decline the loan
      await db.query(`
        UPDATE loan_requests SET
          status = 'declined',
          current_step = 2,
          updated_at = NOW()
        WHERE id = $1
      `, [req.params.id]);

      const statusHistoryId = require('uuid').v4();
      await db.query(`
        INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
        VALUES ($1, $2, 'declined', 2, $3, $4)
      `, [statusHistoryId, req.params.id, req.user.id, quoteData.declineReason || 'Loan declined during quote approval']);

      // Notify borrower
      const notificationId2 = require('uuid').v4();
      await db.query(`
        INSERT INTO notifications (id, user_id, loan_id, type, title, message)
        VALUES ($1, $2, $3, 'quote_declined', $4, $5)
      `, [notificationId2, loan.user_id, req.params.id, 'Quote Request Declined', `Your loan ${loan.loan_number} quote request has been declined: ${quoteData.declineReason || 'Does not meet requirements'}`]);

      await logAudit(req.user.id, 'QUOTE_DECLINED', 'loan', req.params.id, req, { reason: quoteData.declineReason });

      return res.json({
        message: 'Quote request declined',
        declined: true,
        reason: quoteData.declineReason
      });
    }

    // Generate term sheet PDF
    let termSheetPath;
    try {
      termSheetPath = await generateTermSheet(loan, quoteData);
    } catch (error) {
      console.error('Error generating term sheet:', error);
      return res.status(500).json({ 
        error: 'Failed to generate term sheet', 
        details: error.message 
      });
    }

    // Update loan with quote data
    try {
      await db.query(`
        UPDATE loan_requests SET
          status = 'soft_quote_issued',
          current_step = 3,
          soft_quote_generated = true,
          soft_quote_data = $1,
          soft_quote_rate_min = $2,
          soft_quote_rate_max = $3,
          term_sheet_url = $4,
          updated_at = NOW()
        WHERE id = $5
      `, [JSON.stringify(quoteData), quoteData.interestRateMin, quoteData.interestRateMax, termSheetPath, req.params.id]);
    } catch (error) {
      console.error('Error updating loan with quote data:', error);
      return res.status(500).json({ 
        error: 'Failed to update loan with quote data', 
        details: error.message 
      });
    }

    // Add status history
    const statusHistoryId = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'soft_quote_issued', 3, $3, $4)
    `, [statusHistoryId, req.params.id, req.user.id, `Quote approved and generated by ${req.user.full_name || 'admin'}: ${quoteData.rateRange}`]);

    // Generate initial needs list
    try {
      await generateInitialNeedsListForLoan(req.params.id, loan, db);
    } catch (error) {
      console.error('Error generating initial needs list:', error);
      // Don't fail the whole request if needs list generation fails
      console.warn('Continuing despite needs list generation error');
    }

    // Send email notification to borrower
    try {
      const user = await db.query('SELECT * FROM users WHERE id = $1', [loan.user_id]);
      if (user.rows.length > 0) {
        await sendSoftQuoteEmail(user.rows[0], { ...loan, term_sheet_url: termSheetPath }, quoteData);
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't fail the whole request if email fails
      console.warn('Continuing despite email error');
    }

    // Notify borrower
    const notificationId3 = require('uuid').v4();
    await db.query(`
      INSERT INTO notifications (id, user_id, loan_id, type, title, message)
      VALUES ($1, $2, $3, 'quote_approved', $4, $5)
    `, [notificationId3, loan.user_id, req.params.id, 'Quote Approved', `Your loan ${loan.loan_number} quote has been approved! View your term sheet to continue.`]);

    await logAudit(req.user.id, 'QUOTE_APPROVED', 'loan', req.params.id, req, { quoteData });

    res.json({
      message: 'Quote approved and generated successfully',
      quote: quoteData,
      termSheetUrl: termSheetPath
    });
  } catch (error) {
    console.error('Error in approve-quote route:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Disapprove/Decline quote request
router.post('/loan/:id/disapprove-quote', [
  body('reason').optional().isString()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { reason } = req.body;

    // Get loan details
    const loanResult = await db.query('SELECT * FROM loan_requests WHERE id = $1', [req.params.id]);
    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanResult.rows[0];

    // Check if loan is in quote_requested status
    if (loan.status !== 'quote_requested') {
      return res.status(400).json({ 
        error: `Loan is not in quote_requested status. Current status: ${loan.status}` 
      });
    }

    const declineReason = reason || 'Quote request declined by administrator';

    // Update loan to declined status
    await db.query(`
      UPDATE loan_requests SET
        status = 'declined',
        current_step = 2,
        updated_at = NOW()
      WHERE id = $1
    `, [req.params.id]);

    // Add status history
    const statusHistoryId = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'declined', 2, $3, $4)
    `, [statusHistoryId, req.params.id, req.user.id, declineReason]);

    // Notify borrower
    const notificationId = require('uuid').v4();
    await db.query(`
      INSERT INTO notifications (id, user_id, loan_id, type, title, message)
      VALUES ($1, $2, $3, 'quote_declined', $4, $5)
    `, [notificationId, loan.user_id, req.params.id, 'Quote Request Declined', `Your loan ${loan.loan_number} quote request has been declined: ${declineReason}`]);

    await logAudit(req.user.id, 'QUOTE_DISAPPROVED', 'loan', req.params.id, req, { reason: declineReason });

    res.json({
      message: 'Quote request declined successfully',
      reason: declineReason
    });
  } catch (error) {
    next(error);
  }
});

// Delete loan
router.delete('/loan/:id', async (req, res, next) => {
  try {
    // Get loan details for logging
    const loanResult = await db.query('SELECT * FROM loan_requests WHERE id = $1', [req.params.id]);
    if (loanResult.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanResult.rows[0];

    // Delete related records first (due to foreign key constraints)
    // Delete in reverse order of dependencies
    await db.query('DELETE FROM payments WHERE loan_id = $1', [req.params.id]);
    await db.query('DELETE FROM closing_checklist WHERE loan_id = $1', [req.params.id]);
    await db.query('DELETE FROM documents WHERE loan_id = $1', [req.params.id]);
    await db.query('DELETE FROM needs_list_items WHERE loan_id = $1', [req.params.id]);
    await db.query('DELETE FROM loan_status_history WHERE loan_id = $1', [req.params.id]);
    await db.query('DELETE FROM notifications WHERE loan_id = $1', [req.params.id]);
    
    // Finally delete the loan itself
    await db.query('DELETE FROM loan_requests WHERE id = $1', [req.params.id]);

    await logAudit(req.user.id, 'LOAN_DELETED', 'loan', req.params.id, req, { 
      loanNumber: loan.loan_number,
      borrowerName: loan.borrower_name 
    });

    res.json({ 
      message: 'Loan deleted successfully',
      loanNumber: loan.loan_number
    });
  } catch (error) {
    next(error);
  }
});

// Assign processor
router.put('/loan/:id/assign', [
  body('processorId').notEmpty()
], async (req, res, next) => {
  try {
    const { processorId } = req.body;

    await db.query(`
      UPDATE loan_requests SET assigned_processor_id = $1, updated_at = NOW()
      WHERE id = $2
    `, [processorId, req.params.id]);

    await logAudit(req.user.id, 'PROCESSOR_ASSIGNED', 'loan', req.params.id, req, { processorId });

    res.json({ message: 'Processor assigned' });
  } catch (error) {
    next(error);
  }
});

// Add needs list item
router.post('/loan/:id/needs-list', [
  body('documentType').notEmpty(),
  body('folderName').notEmpty(),
  body('description').optional()
], async (req, res, next) => {
  try {
    const { documentType, folderName, description, required = true } = req.body;

    const result = await db.query(`
      INSERT INTO needs_list_items (loan_id, document_type, folder_name, description, is_required, requested_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [req.params.id, documentType, folderName, description, required, req.user.id]);

    // Notify borrower
    const loan = await db.query('SELECT user_id, loan_number FROM loan_requests WHERE id = $1', [req.params.id]);
    const notificationId4 = require('uuid').v4();
    await db.query(`
      INSERT INTO notifications (id, user_id, loan_id, type, title, message)
      VALUES ($1, $2, $3, 'document_request', $4, $5)
    `, [notificationId4, loan.rows[0].user_id, req.params.id, 'Document Requested', `New document requested for loan ${loan.rows[0].loan_number}: ${documentType}`]);

    res.status(201).json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Clean up duplicate needs list items for a loan
router.post('/loan/:id/cleanup-needs-list', requireClerkAuth, async (req, res, next) => {
  try {
    const loanId = req.params.id;
    
    // Find duplicates - keep the most recent one per document_type and folder_name
    const duplicates = await db.query(`
      WITH ranked_items AS (
        SELECT 
          id,
          loan_id,
          document_type,
          folder_name,
          ROW_NUMBER() OVER (
            PARTITION BY loan_id, document_type, folder_name 
            ORDER BY created_at DESC, document_count DESC
          ) as rn,
          (SELECT COUNT(*) FROM documents d WHERE d.needs_list_item_id = nli.id) as document_count
        FROM needs_list_items nli
        WHERE loan_id = $1
      )
      SELECT id FROM ranked_items WHERE rn > 1
    `, [loanId]);
    
    if (duplicates.rows.length === 0) {
      return res.json({ message: 'No duplicates found', removed: 0 });
    }
    
    // Delete duplicate items (keep the first one per group)
    const duplicateIds = duplicates.rows.map(row => row.id);
    await db.query(`
      DELETE FROM needs_list_items 
      WHERE id = ANY($1::uuid[])
    `, [duplicateIds]);
    
    await logAudit(req.user.id, 'NEEDS_LIST_CLEANED', 'loan', loanId, req, {
      removedCount: duplicateIds.length
    });
    
    res.json({ 
      message: `Removed ${duplicateIds.length} duplicate needs list item(s)`,
      removed: duplicateIds.length
    });
  } catch (error) {
    next(error);
  }
});

// Review document / needs list item
router.put('/needs-list/:id/review', [
  body('status').isIn(['reviewed', 'rejected']),
  body('notes').optional()
], async (req, res, next) => {
  try {
    const { status, notes } = req.body;

    await db.query(`
      UPDATE needs_list_items SET 
        status = $1, 
        reviewed_by = $2, 
        review_notes = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [status, req.user.id, notes, req.params.id]);

    res.json({ message: 'Document reviewed' });
  } catch (error) {
    next(error);
  }
});

// Upload commitment letter
router.post('/loan/:id/commitment', [
  body('commitmentLetterUrl').notEmpty()
], async (req, res, next) => {
  try {
    const { commitmentLetterUrl, conditionalItems } = req.body;

    await db.query(`
      UPDATE loan_requests SET 
        commitment_letter_url = $1,
        conditional_items_needed = $2,
        status = 'conditional_commitment_issued',
        current_step = 12,
        updated_at = NOW()
      WHERE id = $3
    `, [commitmentLetterUrl, conditionalItems, req.params.id]);

    const statusHistoryId6 = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'conditional_commitment_issued', 12, $3, 'Conditional commitment letter issued')
    `, [statusHistoryId6, req.params.id, req.user.id]);

    // Notify borrower
    const loan = await db.query('SELECT user_id, loan_number FROM loan_requests WHERE id = $1', [req.params.id]);
    const notificationId5 = require('uuid').v4();
    await db.query(`
      INSERT INTO notifications (id, user_id, loan_id, type, title, message)
      VALUES ($1, $2, $3, 'commitment', $4, $5)
    `, [notificationId5, loan.rows[0].user_id, req.params.id, 'Commitment Letter Ready', `Your commitment letter for loan ${loan.rows[0].loan_number} is ready for download.`]);

    res.json({ message: 'Commitment letter uploaded' });
  } catch (error) {
    next(error);
  }
});

// Schedule closing
router.post('/loan/:id/schedule-closing', [
  body('closingDate').isISO8601()
], async (req, res, next) => {
  try {
    const { closingDate } = req.body;

    await db.query(`
      UPDATE loan_requests SET 
        closing_scheduled_date = $1,
        status = 'closing_scheduled',
        current_step = 14,
        updated_at = NOW()
      WHERE id = $2
    `, [closingDate, req.params.id]);

    const statusHistoryId7 = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'closing_scheduled', 14, $3, $4)
    `, [statusHistoryId7, req.params.id, req.user.id, `Closing scheduled for ${closingDate}`]);

    // Notify borrower
    const loan = await db.query('SELECT user_id, loan_number FROM loan_requests WHERE id = $1', [req.params.id]);
    const notificationId6 = require('uuid').v4();
    await db.query(`
      INSERT INTO notifications (id, user_id, loan_id, type, title, message)
      VALUES ($1, $2, $3, 'closing', $4, $5)
    `, [notificationId6, loan.rows[0].user_id, req.params.id, 'Closing Scheduled', `Your closing for loan ${loan.rows[0].loan_number} is scheduled for ${new Date(closingDate).toLocaleDateString()}.`]);

    res.json({ message: 'Closing scheduled' });
  } catch (error) {
    next(error);
  }
});

// Mark loan as funded
router.post('/loan/:id/fund', [
  body('fundedAmount').isNumeric()
], async (req, res, next) => {
  try {
    const { fundedAmount } = req.body;

    await db.query(`
      UPDATE loan_requests SET 
        funded_date = CURRENT_DATE,
        funded_amount = $1,
        status = 'funded',
        current_step = 15,
        updated_at = NOW()
      WHERE id = $2
    `, [fundedAmount, req.params.id]);

    const statusHistoryId8 = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'funded', 15, $3, $4)
    `, [statusHistoryId8, req.params.id, req.user.id, `Loan funded: $${fundedAmount.toLocaleString()}`]);

    await logAudit(req.user.id, 'LOAN_FUNDED', 'loan', req.params.id, req, { fundedAmount });

    // Notify borrower
    const loan = await db.query('SELECT user_id, loan_number FROM loan_requests WHERE id = $1', [req.params.id]);
    const notificationId7 = require('uuid').v4();
    await db.query(`
      INSERT INTO notifications (id, user_id, loan_id, type, title, message)
      VALUES ($1, $2, $3, 'funded', $4, $5)
    `, [notificationId7, loan.rows[0].user_id, req.params.id, 'Congratulations! Loan Funded', `Your loan ${loan.rows[0].loan_number} has been funded!`]);

    res.json({ message: 'Loan marked as funded' });
  } catch (error) {
    next(error);
  }
});

// CRM search
router.get('/crm/search', async (req, res, next) => {
  try {
    const { q } = req.query;

    const result = await db.query(`
      SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
             cp.city, cp.state, cp.credit_score, cp.fico_score,
             (SELECT COUNT(*) FROM loan_requests lr WHERE lr.user_id = u.id) as loan_count,
             (SELECT SUM(loan_amount) FROM loan_requests lr WHERE lr.user_id = u.id) as total_volume
      FROM users u
      LEFT JOIN crm_profiles cp ON u.id = cp.user_id
      WHERE u.role = 'borrower'
        AND (u.full_name ILIKE $1 OR u.email ILIKE $1 OR u.phone ILIKE $1)
      ORDER BY u.created_at DESC
      LIMIT 50
    `, [`%${q}%`]);

    res.json({ borrowers: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get borrower profile with loan history
router.get('/crm/borrower/:id', async (req, res, next) => {
  try {
    const user = await db.query(`
      SELECT u.*, cp.*
      FROM users u
      LEFT JOIN crm_profiles cp ON u.id = cp.user_id
      WHERE u.id = $1
    `, [req.params.id]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Borrower not found' });
    }

    const loans = await db.query(`
      SELECT * FROM loan_requests WHERE user_id = $1 ORDER BY created_at DESC
    `, [req.params.id]);

    res.json({
      borrower: user.rows[0],
      loans: loans.rows
    });
  } catch (error) {
    next(error);
  }
});

// Get user profile image from Clerk
router.get('/user/:userId/image', requireClerkAuth, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Use Clerk backend SDK to get user image
    const { createClerkClient } = require('@clerk/backend');
    const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    
    const user = await clerkClient.users.getUser(userId);
    
    res.json({ imageUrl: user?.imageUrl || null });
  } catch (error) {
    console.error('Error fetching user image:', error);
    res.json({ imageUrl: null });
  }
});

// Get processors list
router.get('/processors', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT id, full_name, email 
      FROM users 
      WHERE role IN ('operations', 'admin') AND is_active = true
      ORDER BY full_name
    `);
    res.json({ processors: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get recent closings (for transactions page)
router.get('/recent-closings', async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;
    
    const result = await db.query(`
      SELECT 
        lr.loan_number,
        lr.property_address,
        lr.property_city,
        lr.property_state,
        lr.loan_amount,
        lr.funded_amount,
        lr.funded_date,
        u.id as borrower_id,
        u.full_name as borrower_name,
        u.email as borrower_email,
        lr.property_type,
        lr.transaction_type
      FROM loan_requests lr
      JOIN users u ON lr.user_id = u.id
      WHERE lr.status = 'funded' 
      AND lr.funded_date IS NOT NULL
      ORDER BY lr.funded_date DESC
      LIMIT $1
    `, [limit]);

    res.json({ closings: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get closing checklist for a loan
router.get('/loan/:id/closing-checklist', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT cci.*, 
             u1.full_name as created_by_name,
             u2.full_name as completed_by_name,
             cci.completed
      FROM closing_checklist_items cci
      LEFT JOIN users u1 ON cci.created_by = u1.id
      LEFT JOIN users u2 ON cci.completed_by = u2.id
      WHERE cci.loan_id = $1
      ORDER BY cci.created_at
    `, [req.params.id]);

    res.json({ checklist: result.rows });
  } catch (error) {
    next(error);
  }
});

// Add closing checklist item (operations only)
router.post('/loan/:id/closing-checklist', [
  body('itemName').trim().notEmpty(),
  body('category').optional(),
  body('required').optional().isBoolean(),
  body('description').optional()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemName, description, category, required } = req.body;
    const checklistId = require('uuid').v4();

    // Check which columns exist in closing_checklist_items table
    let hasCategoryColumn = false;
    let hasRequiredColumn = false;
    try {
      const columnCheck = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'closing_checklist_items'
        AND column_name IN ('category', 'required')
      `);
      const columnNames = columnCheck.rows.map(row => row.column_name.toLowerCase());
      hasCategoryColumn = columnNames.includes('category');
      hasRequiredColumn = columnNames.includes('required');
    } catch (error) {
      console.warn('[Closing Checklist] Error checking columns:', error);
    }

    // Build INSERT statement dynamically based on available columns
    const columns = ['id', 'loan_id', 'item_name', 'description', 'created_by'];
    const values = [checklistId, req.params.id, itemName, description || null, req.user.id];
    const placeholders = ['$1', '$2', '$3', '$4', '$5'];
    let paramIndex = 5;

    if (hasCategoryColumn) {
      columns.push('category');
      values.push(category || 'general');
      placeholders.push(`$${++paramIndex}`);
    }
    if (hasRequiredColumn) {
      columns.push('required');
      values.push(required !== false);
      placeholders.push(`$${++paramIndex}`);
    }

    // Check if this is the first checklist item BEFORE inserting
    // This ensures we only update status when adding the very first item
    const existingItems = await db.query(`
      SELECT COUNT(*) as count FROM closing_checklist_items WHERE loan_id = $1
    `, [req.params.id]);
    
    const isFirstItem = parseInt(existingItems.rows[0].count) === 0;
    
    // Also check current loan status to ensure we only update if still in conditional_commitment_issued
    const loanCheck = await db.query(`
      SELECT status FROM loan_requests WHERE id = $1
    `, [req.params.id]);
    
    const shouldUpdateStatus = isFirstItem && loanCheck.rows[0]?.status === 'conditional_commitment_issued';

    const result = await db.query(`
      INSERT INTO closing_checklist_items (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `, values);

    // Update loan status if this is the first item and loan is still in conditional_commitment_issued
    if (shouldUpdateStatus) {
      await db.query(`
        UPDATE loan_requests SET 
          status = 'closing_checklist_issued',
          current_step = 13,
          updated_at = NOW()
        WHERE id = $1
      `, [req.params.id]);

      // Log status history
      const statusHistoryId = require('uuid').v4();
      await db.query(`
        INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
        VALUES ($1, $2, 'closing_checklist_issued', 13, $3, 'Closing checklist issued')
      `, [statusHistoryId, req.params.id, req.user.id]);

      // Notify borrower
      const loan = await db.query('SELECT user_id, loan_number FROM loan_requests WHERE id = $1', [req.params.id]);
      const notificationId = require('uuid').v4();
      await db.query(`
        INSERT INTO notifications (id, user_id, loan_id, type, title, message)
        VALUES ($1, $2, $3, 'status_update', $4, $5)
      `, [notificationId, loan.rows[0].user_id, req.params.id, 'Closing Checklist Ready', `Your closing checklist for loan ${loan.rows[0].loan_number} is ready. Please review and complete the required items.`]);
    }

    await logAudit(req.user.id, 'CLOSING_CHECKLIST_ITEM_ADDED', 'loan', req.params.id, req, {
      itemName,
      category
    });

    res.status(201).json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update closing checklist item
// Note: authenticate and requireOps are already applied via router.use() at the top
router.put('/loan/:id/closing-checklist/:itemId', 
  body('completed').optional().isBoolean(),
  body('notes').optional(),
  async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { completed, notes } = req.body;

    // Check if table has 'completed' column or uses 'status'
    let hasCompletedColumn = false;
    try {
      const columnCheck = await db.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'closing_checklist_items'
        AND column_name = 'completed'
      `);
      hasCompletedColumn = columnCheck.rows.length > 0;
    } catch (error) {
      console.warn('[Closing Checklist Update] Error checking columns:', error);
    }

    let updateQuery = `
      UPDATE closing_checklist_items SET
        updated_at = NOW()
    `;
    const params = [];
    let paramIndex = 1;

    if (completed !== undefined) {
      if (hasCompletedColumn) {
        // Table has 'completed' column (boolean)
        updateQuery += `, completed = $${paramIndex++}`;
        params.push(completed);
      } else {
        // Table uses 'status' column ('pending', 'completed', 'waived')
        updateQuery += `, status = $${paramIndex++}`;
        params.push(completed ? 'completed' : 'pending');
      }
      
      if (completed) {
        updateQuery += `, completed_by = $${paramIndex++}, completed_at = NOW()`;
        params.push(req.user.id);
      } else {
        updateQuery += `, completed_by = NULL, completed_at = NULL`;
      }
    }

    if (notes !== undefined) {
      updateQuery += `, notes = $${paramIndex++}`;
      params.push(notes);
    }

    updateQuery += ` WHERE id = $${paramIndex++} AND loan_id = $${paramIndex++}`;
    params.push(req.params.itemId, req.params.id);

    const result = await db.query(updateQuery, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    await logAudit(req.user.id, 'CLOSING_CHECKLIST_ITEM_UPDATED', 'loan', req.params.id, req, {
      itemId: req.params.itemId,
      completed
    });

    res.json({ message: 'Checklist item updated' });
  } catch (error) {
    next(error);
  }
});

// Delete closing checklist item (operations only)
router.delete('/loan/:id/closing-checklist/:itemId', async (req, res, next) => {
  try {
    const result = await db.query(`
      DELETE FROM closing_checklist_items
      WHERE id = $1 AND loan_id = $2
    `, [req.params.itemId, req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Checklist item not found' });
    }

    await logAudit(req.user.id, 'CLOSING_CHECKLIST_ITEM_DELETED', 'loan', req.params.id, req, {
      itemId: req.params.itemId
    });

    res.json({ message: 'Checklist item deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
