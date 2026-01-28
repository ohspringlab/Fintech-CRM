const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/config');
const { requireClerkAuth } = require('../middleware/clerkAuth');
const { logAudit } = require('../middleware/audit');
const { generateTermSheet } = require('../services/pdfService');
const { generateSoftQuote, calculateDSCR, getInitialNeedsList, generateInitialNeedsListForLoan } = require('../services/quoteService');
const { sendWelcomeEmail, sendNeedsListEmail, sendSoftQuoteEmail, notifyOpsQuoteRequest } = require('../services/emailService');

const router = express.Router();

// Loan status constants matching the tracker
const LOAN_STATUSES = [
  'new_request',
  'quote_requested',
  'soft_quote_issued',
  'term_sheet_issued',
  'term_sheet_signed',
  'needs_list_sent',
  'needs_list_complete',
  'submitted_to_underwriting',
  'appraisal_ordered',
  'appraisal_received',
  'conditionally_approved',
  'conditional_items_needed',
  'conditional_commitment_issued',
  'clear_to_close',
  'closing_scheduled',
  'funded'
];

// Get all loans for current user (borrower)
router.get('/', requireClerkAuth, async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT id, loan_number, property_address, property_city, property_state, property_zip,
             property_type, residential_units, commercial_type, is_portfolio, portfolio_count,
             request_type, transaction_type, borrower_type, property_value, loan_amount,
             requested_ltv, documentation_type, dscr_ratio,
             status, current_step, soft_quote_generated, term_sheet_url, term_sheet_signed,
             credit_authorized, appraisal_paid, full_application_completed,
             created_at, updated_at
      FROM loan_requests
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.user.id]);

    res.json({ loans: result.rows });
  } catch (error) {
    next(error);
  }
});

// Generate needs list for a loan (if missing)
// IMPORTANT: This route must come BEFORE router.get('/:id') to ensure proper matching
router.post('/:id/generate-needs-list', requireClerkAuth, async (req, res, next) => {
  try {
    // Check if user is operations/admin (can access any loan) or if loan belongs to user
    const isOps = ['operations', 'admin'].includes(req.user.role);
    
    let loanCheck;
    if (isOps) {
      // Operations/admin can generate needs list for any loan
      loanCheck = await db.query('SELECT * FROM loan_requests WHERE id = $1', [req.params.id]);
    } else {
      // Regular users can only generate for their own loans
      loanCheck = await db.query(
        'SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2',
        [req.params.id, req.user.id]
      );
    }
    
    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanCheck.rows[0];
    
    // For non-ops users, verify ownership
    if (!isOps && loan.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied. This loan does not belong to you.' });
    }
    
    // Check if needs list already exists
    const existingNeedsList = await db.query('SELECT COUNT(*) as count FROM needs_list_items WHERE loan_id = $1', [req.params.id]);
    
    if (parseInt(existingNeedsList.rows[0].count) > 0) {
      return res.json({ 
        message: 'Needs list already exists',
        generated: false,
        itemsCount: parseInt(existingNeedsList.rows[0].count)
      });
    }

    // Generate needs list
    try {
      await generateInitialNeedsListForLoan(req.params.id, loan, db);
    } catch (genError) {
      console.error('Error in generateInitialNeedsListForLoan:', genError);
      return res.status(500).json({ 
        error: 'Failed to generate needs list',
        message: genError.message,
        details: process.env.NODE_ENV === 'development' ? genError.stack : undefined
      });
    }
    
    // Fetch the newly created needs list
    const needsList = await db.query('SELECT * FROM needs_list_items WHERE loan_id = $1', [req.params.id]);

    res.json({ 
      message: 'Needs list generated successfully',
      generated: true,
      itemsCount: needsList.rows.length
    });
  } catch (error) {
    console.error('Error generating needs list:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get single loan details
router.get('/:id', requireClerkAuth, async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);

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

    // Get needs list with folder status - deduplicate by getting the most recent item per document_type
    let needsListResult;
    try {
      needsListResult = await db.query(`
        SELECT DISTINCT ON (COALESCE(nli.document_type, nli.name, ''), COALESCE(nli.folder_name, nli.category, '')) 
               nli.*,
               COALESCE(nli.is_required, true) as is_required,
               COALESCE(NULLIF(nli.document_type, ''), nli.name, '') as document_type,
               COALESCE(NULLIF(nli.folder_name, ''), nli.category, '') as folder_name,
               (SELECT COUNT(*) FROM documents d WHERE d.needs_list_item_id = nli.id) as document_count,
               (SELECT MAX(uploaded_at) FROM documents d WHERE d.needs_list_item_id = nli.id) as last_upload
        FROM needs_list_items nli
        WHERE nli.loan_id = $1
          AND (nli.document_type IS NOT NULL OR nli.name IS NOT NULL)
          AND (nli.folder_name IS NOT NULL OR nli.category IS NOT NULL)
        ORDER BY COALESCE(NULLIF(nli.document_type, ''), nli.name, ''),
                 COALESCE(NULLIF(nli.folder_name, ''), nli.category, ''),
                 COALESCE(nli.created_at, CURRENT_TIMESTAMP) DESC,
                 COALESCE(nli.is_required, true) DESC
      `, [req.params.id]);
    } catch (queryError) {
      // If query fails, try simpler query without DISTINCT ON
      console.error('DISTINCT ON query failed, trying simpler query:', queryError.message);
      try {
        needsListResult = await db.query(`
          SELECT nli.*,
                 COALESCE(nli.is_required, true) as is_required,
                 COALESCE(NULLIF(nli.document_type, ''), nli.name, '') as document_type,
                 COALESCE(NULLIF(nli.folder_name, ''), nli.category, '') as folder_name,
                 (SELECT COUNT(*) FROM documents d WHERE d.needs_list_item_id = nli.id) as document_count,
                 (SELECT MAX(uploaded_at) FROM documents d WHERE d.needs_list_item_id = nli.id) as last_upload
          FROM needs_list_items nli
          WHERE nli.loan_id = $1
          ORDER BY COALESCE(nli.created_at, CURRENT_TIMESTAMP) DESC
        `, [req.params.id]);
      } catch (simpleQueryError) {
        console.error('Simple query also failed:', simpleQueryError.message);
        needsListResult = { rows: [] };
      }
    }
    
    // Map is_required to required for frontend compatibility
    const needsList = {
      rows: needsListResult.rows.map(item => {
        const { is_required, ...rest } = item;
        return { ...rest, required: is_required || false };
      })
    };

    // Get documents grouped by folder
    // Note: documents table has 'name' instead of 'file_name', and 'file_url' instead of separate file fields
    let documents;
    try {
      documents = await db.query(`
        SELECT id, name as file_name, name as original_name, category, file_url, status, uploaded_at, needs_list_item_id
        FROM documents WHERE loan_id = $1 ORDER BY category, uploaded_at DESC
      `, [req.params.id]);
    } catch (documentsError) {
      console.error('Error fetching documents:', documentsError.message);
      documents = { rows: [] };
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
      needsList: needsList.rows,
      documents: documents.rows,
      payments: payments.rows
    });
  } catch (error) {
    next(error);
  }
});

// Create new loan request (for existing users - duplicates personal info)
router.post('/', requireClerkAuth, [
  body('propertyAddress').trim().notEmpty(),
  body('propertyCity').trim().notEmpty(),
  body('propertyState').trim().notEmpty(),
  body('propertyZip').trim().isLength({ min: 5 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { propertyAddress, propertyCity, propertyState, propertyZip, propertyName } = req.body;

    // Generate loan ID and loan number
    const { v4: uuidv4 } = require('uuid');
    const loanId = uuidv4();
    
    // Get the maximum loan number for the current year to avoid duplicates
    const currentYear = new Date().getFullYear();
    const maxLoanNumber = await db.query(`
      SELECT loan_number 
      FROM loan_requests 
      WHERE loan_number LIKE $1 
      ORDER BY loan_number DESC 
      LIMIT 1
    `, [`RPC-${currentYear}-%`]);
    
    let nextNumber = 1;
    if (maxLoanNumber.rows.length > 0) {
      // Extract the number part and increment
      const lastNumber = maxLoanNumber.rows[0].loan_number.split('-')[2];
      nextNumber = parseInt(lastNumber) + 1;
    }
    
    const loanNumber = `RPC-${currentYear}-${String(nextNumber).padStart(4, '0')}`;

    const result = await db.query(`
      INSERT INTO loan_requests (
        id, user_id, loan_number, property_address, property_city, property_state, property_zip, property_name,
        status, current_step
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new_request', 1)
      RETURNING *
    `, [loanId, req.user.id, loanNumber, propertyAddress, propertyCity, propertyState, propertyZip, propertyName || null]);

    const statusHistoryId = uuidv4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'new_request', 1, $3, 'New loan request created')
    `, [statusHistoryId, result.rows[0].id, req.user.id]);

    // Create document folders automatically
    await createDocumentFoldersForLoan(result.rows[0].id);

    await logAudit(req.user.id, 'LOAN_CREATED', 'loan', result.rows[0].id, req);

    res.status(201).json({ loan: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update loan request (Step 2-3 - Property & Loan Details)
router.put('/:id', requireClerkAuth, async (req, res, next) => {
  try {
    // Verify ownership
    const check = await db.query('SELECT id, status FROM loan_requests WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const {
      propertyType, residentialUnits, isPortfolio, portfolioCount, commercialType,
      requestType, transactionType, borrowerType, propertyValue, requestedLtv, documentationType,
      annualRentalIncome, annualOperatingExpenses, annualLoanPayments,
      propertyAddress, propertyCity, propertyState, propertyZip, propertyName
    } = req.body;

    // Normalize empty strings to null for fields with check constraints
    const normalizedRequestType = (requestType && requestType.trim() !== '') ? requestType : null;
    const normalizedBorrowerType = (borrowerType && borrowerType.trim() !== '') ? borrowerType : null;
    const normalizedPropertyType = (propertyType && propertyType.trim() !== '') ? propertyType : null;
    const normalizedDocumentationType = (documentationType && documentationType.trim() !== '') ? documentationType : null;

    // Calculate loan amount
    const loanAmount = propertyValue && requestedLtv ? (propertyValue * requestedLtv / 100) : null;

    // Calculate DSCR if income data provided
    let dscrRatio = null;
    let noi = null;
    if (annualRentalIncome && annualOperatingExpenses !== undefined && annualLoanPayments) {
      noi = annualRentalIncome - annualOperatingExpenses;
      dscrRatio = calculateDSCR(annualRentalIncome, annualOperatingExpenses, annualLoanPayments);
    }

    const result = await db.query(`
      UPDATE loan_requests SET
        property_address = COALESCE($1, property_address),
        property_city = COALESCE($2, property_city),
        property_state = COALESCE($3, property_state),
        property_zip = COALESCE($4, property_zip),
        property_name = COALESCE($5, property_name),
        property_type = COALESCE($6, property_type),
        residential_units = COALESCE($7, residential_units),
        is_portfolio = COALESCE($8, is_portfolio),
        portfolio_count = COALESCE($9, portfolio_count),
        commercial_type = COALESCE($10, commercial_type),
        request_type = COALESCE($11, request_type),
        transaction_type = COALESCE($12, transaction_type),
        borrower_type = COALESCE($13, borrower_type),
        property_value = COALESCE($14, property_value),
        requested_ltv = COALESCE($15, requested_ltv),
        loan_amount = COALESCE($16, loan_amount),
        documentation_type = COALESCE($17, documentation_type),
        annual_rental_income = COALESCE($18, annual_rental_income),
        annual_operating_expenses = COALESCE($19, annual_operating_expenses),
        noi = COALESCE($20, noi),
        annual_loan_payments = COALESCE($21, annual_loan_payments),
        dscr_ratio = COALESCE($22, dscr_ratio),
        current_step = GREATEST(current_step, 2),
        updated_at = NOW()
      WHERE id = $23
      RETURNING *
    `, [
      propertyAddress, propertyCity, propertyState, propertyZip, propertyName,
      normalizedPropertyType, residentialUnits, isPortfolio, portfolioCount, commercialType,
      normalizedRequestType, transactionType, normalizedBorrowerType, propertyValue, requestedLtv, loanAmount, normalizedDocumentationType,
      annualRentalIncome, annualOperatingExpenses, noi, annualLoanPayments, dscrRatio,
      req.params.id
    ]);

    await logAudit(req.user.id, 'LOAN_UPDATED', 'loan', req.params.id, req);

    res.json({ loan: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Submit loan request for quote
router.post('/:id/submit', requireClerkAuth, async (req, res, next) => {
  try {
    // Check email verification
    const userCheck = await db.query('SELECT email_verified FROM users WHERE id = $1', [req.user.id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!userCheck.rows[0].email_verified) {
      return res.status(403).json({ 
        error: 'Email verification required',
        requiresVerification: true 
      });
    }

    const check = await db.query('SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = check.rows[0];

    // Validate required fields
    if (!loan.property_type || !loan.request_type || !loan.property_value) {
      return res.status(400).json({ error: 'Please complete all required loan details' });
    }

    // Run eligibility checks
    const { checkEligibility } = require('../services/eligibilityService');
    const eligibility = checkEligibility(loan);
    
    if (!eligibility.eligible) {
      // Format errors for frontend display
      const errorMessages = eligibility.errors.map(err => err.message || err);
      return res.status(400).json({
        error: 'Loan request does not meet eligibility requirements',
        eligibilityErrors: eligibility.errors,
        errors: errorMessages // Also include as simple array for compatibility
      });
    }

    // Auto-generate soft quote on submit (if DSCR is valid or exempt)
    const { shouldAutoDecline } = require('../services/quoteService');
    const declineCheck = shouldAutoDecline(loan);
    
    if (declineCheck.declined) {
      // Auto-decline if DSCR < 1.0x (unless exempt)
      await db.query(`
        UPDATE loan_requests SET 
          status = 'declined',
          dscr_auto_declined = true,
          current_step = 3,
          updated_at = NOW()
        WHERE id = $1
      `, [req.params.id]);

      const statusHistoryId1 = require('uuid').v4();
      await db.query(`
        INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
        VALUES ($1, $2, 'declined', 3, $3, $4)
      `, [statusHistoryId1, req.params.id, req.user.id, declineCheck.reason]);

      await logAudit(req.user.id, 'LOAN_DECLINED', 'loan', req.params.id, req);

      return res.status(400).json({
        error: 'Loan request declined',
        reason: declineCheck.reason,
        declined: true
      });
    }

    // Get user's credit score if available (for quote generation)
    const profile = await db.query('SELECT credit_score, fico_score FROM crm_profiles WHERE user_id = $1', [req.user.id]);
    const creditScore = profile.rows[0]?.fico_score || profile.rows[0]?.credit_score || null;

    // Always set status to quote_requested - requires admin approval before generating quote
    await db.query(`
      UPDATE loan_requests SET status = 'quote_requested', current_step = 2, updated_at = NOW()
      WHERE id = $1
    `, [req.params.id]);

    const statusHistoryId1 = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'quote_requested', 2, $3, 'Loan request submitted - awaiting admin approval')
    `, [statusHistoryId1, req.params.id, req.user.id]);

    // Notify admin/operations team
    const loanNumber = loan.loan_number || `Loan ${req.params.id.substring(0, 8)}`;
    const opsUsers = await db.query(
      "SELECT id FROM users WHERE role IN ('admin', 'operations') AND is_active = true"
    );
    for (const opsUser of opsUsers.rows) {
      const notificationId = require('uuid').v4();
      await db.query(`
        INSERT INTO notifications (id, user_id, loan_id, type, title, message)
        VALUES ($1, $2, $3, 'quote_request', $4, $5)
      `, [notificationId, opsUser.id, req.params.id, 'New Quote Request', `${loanNumber} requires quote approval`]);
    }

    // Send email notification to operations team
    const user = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (user.rows.length > 0) {
      try {
        await notifyOpsQuoteRequest(user.rows[0], loan);
      } catch (emailError) {
        console.error('Failed to send quote request email:', emailError);
        // Don't fail the request if email fails
      }
    }

    await logAudit(req.user.id, 'LOAN_SUBMITTED', 'loan', req.params.id, req);

    res.json({ 
      message: 'Loan request submitted successfully. Your request is pending admin approval.',
      requiresApproval: true
    });
  } catch (error) {
    next(error);
  }
});

// Credit authorization (Step 4)
router.post('/:id/credit-auth', requireClerkAuth, [
  body('consent').custom((value) => {
    if (value !== true && value !== 'true') {
      throw new Error('Consent must be provided');
    }
    return true;
  })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const check = await db.query('SELECT id FROM loan_requests WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const clientIp = req.ip || req.connection?.remoteAddress;

    await db.query(`
      UPDATE loan_requests SET
        credit_authorized = true,
        credit_auth_timestamp = NOW(),
        credit_auth_ip = $1,
        credit_status = 'authorized',
        current_step = GREATEST(current_step, 4),
        updated_at = NOW()
      WHERE id = $2
    `, [clientIp, req.params.id]);

    const statusHistoryId2 = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'credit_authorized', 4, $3, 'Credit authorization consent provided')
    `, [statusHistoryId2, req.params.id, req.user.id]);

    await logAudit(req.user.id, 'CREDIT_AUTHORIZED', 'loan', req.params.id, req, { ip: clientIp });

    res.json({ message: 'Credit authorization recorded' });
  } catch (error) {
    next(error);
  }
});

// Generate soft quote (Step 5)
router.post('/:id/soft-quote', requireClerkAuth, async (req, res, next) => {
  try {
    const check = await db.query('SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = check.rows[0];

    if (!loan.credit_authorized) {
      return res.status(400).json({ error: 'Credit authorization required first' });
    }

    // Get user's credit score if available
    const profile = await db.query('SELECT credit_score, fico_score FROM crm_profiles WHERE user_id = $1', [req.user.id]);
    const creditScore = profile.rows[0]?.fico_score || profile.rows[0]?.credit_score || null;

    // Generate soft quote with DSCR validation
    const quoteData = generateSoftQuote(loan, creditScore);

    // Check for auto-decline
    if (!quoteData.approved) {
      await db.query(`
        UPDATE loan_requests SET
          dscr_auto_declined = true,
          soft_quote_data = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify(quoteData), req.params.id]);

      return res.status(400).json({
        error: 'Loan request declined',
        reason: quoteData.declineReason,
        quote: quoteData
      });
    }

    // Generate term sheet PDF
    const termSheetPath = await generateTermSheet(loan, quoteData);

    await db.query(`
      UPDATE loan_requests SET
        soft_quote_generated = true,
        soft_quote_data = $1,
        soft_quote_rate_min = $2,
        soft_quote_rate_max = $3,
        term_sheet_url = $4,
        status = 'soft_quote_issued',
        current_step = GREATEST(current_step, 5),
        updated_at = NOW()
      WHERE id = $5
    `, [JSON.stringify(quoteData), quoteData.interestRateMin, quoteData.interestRateMax, termSheetPath, req.params.id]);

    const statusHistoryId3 = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'soft_quote_issued', 5, $3, $4)
    `, [statusHistoryId3, req.params.id, req.user.id, `Soft quote generated: ${quoteData.rateRange}`]);

    // Generate initial needs list
    await generateInitialNeedsListForLoan(req.params.id, loan, db);

    // Send email notification
    const user = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    await sendSoftQuoteEmail(user.rows[0], { ...loan, term_sheet_url: termSheetPath }, quoteData);

    res.json({ 
      message: 'Soft quote generated',
      quote: quoteData,
      termSheetUrl: termSheetPath
    });
  } catch (error) {
    next(error);
  }
});

// Sign term sheet
router.post('/:id/sign-term-sheet', requireClerkAuth, async (req, res, next) => {
  try {
    // Debug logging
    if (process.env.NODE_ENV !== 'production') {
      console.log('📝 Sign term sheet request:', {
        loanId: req.params.id,
        userId: req.user?.id,
        userEmail: req.user?.email
      });
    }
    
    // First check if loan exists
    const loanCheck = await db.query('SELECT id, user_id, soft_quote_generated FROM loan_requests WHERE id = $1', [req.params.id]);
    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found', loanId: req.params.id });
    }
    
    const partialLoan = loanCheck.rows[0];
    
    // Check if loan belongs to current user
    if (partialLoan.user_id !== req.user.id) {
      // Check if the loan belongs to a user with the same email (migration case)
      const ownerCheck = await db.query('SELECT id, email FROM users WHERE id = $1', [partialLoan.user_id]);
      if (ownerCheck.rows.length > 0 && ownerCheck.rows[0].email === req.user.email) {
        // Email matches - this is a migration case, update the loan's user_id
        console.log(`[Sign Term Sheet] Migrating loan ${req.params.id} from user ${partialLoan.user_id} to ${req.user.id} (email match: ${req.user.email})`);
        await db.query('UPDATE loan_requests SET user_id = $1, updated_at = NOW() WHERE id = $2', [req.user.id, req.params.id]);
        // Update the partialLoan object for use below
        partialLoan.user_id = req.user.id;
      } else {
        // Loan belongs to a different user
        return res.status(403).json({ 
          error: 'Access denied', 
          message: 'This loan does not belong to you',
          loanId: req.params.id,
          yourUserId: req.user.id,
          loanUserId: partialLoan.user_id
        });
      }
    }
    
    // Now check if soft quote is generated
    if (!partialLoan.soft_quote_generated) {
      return res.status(400).json({ error: 'Soft quote must be generated first' });
    }

    await db.query(`
      UPDATE loan_requests SET
        term_sheet_signed = true,
        term_sheet_signed_at = NOW(),
        status = 'term_sheet_signed',
        updated_at = NOW()
      WHERE id = $1
    `, [req.params.id]);

    const statusHistoryId4 = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'term_sheet_signed', 5, $3, 'Term sheet signed by borrower')
    `, [statusHistoryId4, req.params.id, req.user.id]);

    // Get loan and user data
    const loan = await db.query('SELECT * FROM loan_requests WHERE id = $1', [req.params.id]);
    const user = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    
    // Check if needs list exists, if not generate it
    let needsList = await db.query('SELECT * FROM needs_list_items WHERE loan_id = $1', [req.params.id]);
    
    if (needsList.rows.length === 0) {
      // Generate needs list if it doesn't exist
      await generateInitialNeedsListForLoan(req.params.id, loan.rows[0], db);
      // Fetch the newly created needs list
      needsList = await db.query('SELECT * FROM needs_list_items WHERE loan_id = $1', [req.params.id]);
    }
    
    // Send needs list email
    await sendNeedsListEmail(user.rows[0], loan.rows[0], needsList.rows);

    // Update status to needs list sent
    await db.query(`
      UPDATE loan_requests SET 
        status = 'needs_list_sent',
        current_step = GREATEST(current_step, 6),
        updated_at = NOW()
      WHERE id = $1
    `, [req.params.id]);
    
    // Add status history
    const statusHistoryId5 = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'needs_list_sent', 6, $3, 'Needs list sent to borrower after term sheet signing')
    `, [statusHistoryId5, req.params.id, req.user.id]);

    res.json({ message: 'Term sheet signed successfully' });
  } catch (error) {
    next(error);
  }
});

// Submit/Complete needs list (Step 6 completion)
router.post('/:id/complete-needs-list', requireClerkAuth, async (req, res, next) => {
  try {
    // Verify loan belongs to user
    const loanCheck = await db.query(
      'SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    
    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanCheck.rows[0];
    
    // Only allow if status is needs_list_sent
    if (loan.status !== 'needs_list_sent') {
      return res.status(400).json({ 
        error: 'Cannot complete needs list',
        message: `Loan status must be 'needs_list_sent'. Current status: ${loan.status}`
      });
    }

    // Check if all required documents have been uploaded
    const needsListCheck = await db.query(`
      SELECT 
        nli.id,
        nli.document_type,
        nli.is_required as required,
        (SELECT COUNT(*) FROM documents d WHERE d.needs_list_item_id = nli.id) as document_count
      FROM needs_list_items nli
      WHERE nli.loan_id = $1
    `, [req.params.id]);

    const requiredItems = needsListCheck.rows.filter(item => item.required);
    const missingRequired = requiredItems.filter(item => item.document_count === 0);

    if (missingRequired.length > 0) {
      return res.status(400).json({
        error: 'Missing required documents',
        message: `Please upload documents for: ${missingRequired.map(item => item.document_type).join(', ')}`,
        missingItems: missingRequired.map(item => item.document_type)
      });
    }

    // Update loan status to needs_list_complete
    await db.query(`
      UPDATE loan_requests SET 
        status = 'needs_list_complete',
        current_step = GREATEST(current_step, 7),
        updated_at = NOW()
      WHERE id = $1
    `, [req.params.id]);

    // Add status history
    const statusHistoryId = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'needs_list_complete', 7, $3, 'Borrower submitted all required documents')
    `, [statusHistoryId, req.params.id, req.user.id]);

    // Notify operations team - generate unique ID for each notification
    await db.query(`
      INSERT INTO notifications (id, user_id, loan_id, type, title, message)
      SELECT gen_random_uuid(), id, $1, 'status_update', $2, $3
      FROM users WHERE role IN ('operations', 'admin')
    `, [
      req.params.id,
      'Documents Submitted',
      `${req.user.full_name} has submitted all required documents for loan ${loan.loan_number}. Ready for review.`
    ]);

    await logAudit(req.user.id, 'NEEDS_LIST_COMPLETED', 'loan', req.params.id, req);

    res.json({ 
      message: 'Documents submitted successfully. Your loan application will be reviewed by our team.',
      status: 'needs_list_complete'
    });
  } catch (error) {
    next(error);
  }
});

// Submit full application (Step 7)
router.post('/:id/full-application', requireClerkAuth, async (req, res, next) => {
  try {
    const check = await db.query('SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = check.rows[0];
    const { applicationData } = req.body;

    // Generate PDF
    const { generateApplicationPdf } = require('../services/pdfService');
    const pdfPath = await generateApplicationPdf(loan, applicationData);

    await db.query(`
      UPDATE loan_requests SET
        full_application_data = $1,
        full_application_completed = true,
        full_application_pdf_url = $2,
        current_step = GREATEST(current_step, 7),
        updated_at = NOW()
      WHERE id = $3
    `, [JSON.stringify(applicationData), pdfPath, req.params.id]);

    const statusHistoryId5 = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'full_application_submitted', 7, $3, 'Full loan application submitted')
    `, [statusHistoryId5, req.params.id, req.user.id]);

    await logAudit(req.user.id, 'FULL_APPLICATION_SUBMITTED', 'loan', req.params.id, req);

    res.json({ 
      message: 'Full application submitted',
      pdfUrl: pdfPath
    });
  } catch (error) {
    next(error);
  }
});

// Get closing checklist for borrower
router.get('/:id/closing-checklist', requireClerkAuth, async (req, res, next) => {
  try {
    // Verify ownership
    const check = await db.query('SELECT id FROM loan_requests WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Check if table exists, if not return empty array
    let result;
    try {
      result = await db.query(`
        SELECT cci.*, 
               u1.full_name as created_by_name,
               u2.full_name as completed_by_name,
               COALESCE(cci.completed, false) as completed
        FROM closing_checklist_items cci
        LEFT JOIN users u1 ON cci.created_by = u1.id
        LEFT JOIN users u2 ON cci.completed_by = u2.id
        WHERE cci.loan_id = $1
        ORDER BY cci.created_at
      `, [req.params.id]);
    } catch (queryError) {
      // If table doesn't exist or query fails, return empty checklist
      console.error('Error fetching closing checklist:', queryError.message);
      return res.json({ checklist: [] });
    }

    res.json({ checklist: result.rows });
  } catch (error) {
    console.error('Error in closing-checklist route:', error);
    next(error);
  }
});

// Update closing checklist item for borrower
router.put('/:id/closing-checklist/:itemId', requireClerkAuth, [
  body('completed').optional().isBoolean(),
  body('notes').optional()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify ownership
    const check = await db.query('SELECT id FROM loan_requests WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
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

    res.json({ message: 'Checklist item updated' });
  } catch (error) {
    next(error);
  }
});

// Helper: Create document folders for a loan
async function createDocumentFoldersForLoan(loanId) {
  const folders = [
    { name: 'Application', description: 'Loan application documents' },
    { name: 'Entity Documents', description: 'LLC/Corp documents, Operating Agreement, Articles of Organization' },
    { name: 'Property Insurance', description: 'Property insurance documents' },
    { name: 'Personal Financial Statement', description: 'Personal financial statements and supporting documents' },
    { name: 'Property Financial Statements', description: 'Property income statements, tax returns, and financial records' },
    { name: 'Rent Roll & Leases', description: 'Rent roll and lease agreements' }
  ];

  // Create a placeholder needs_list_item for each folder to make it appear in the UI
  // Check which columns exist (some are NOT NULL and must be included)
  let hasNameColumn = false;
  let hasCategoryColumn = false;
  let hasLoanTypeColumn = false;
  let hasIsRequiredColumn = false;
  let hasRequiredColumn = false;
  
  try {
    const columns = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'needs_list_items' 
      AND column_name IN ('name', 'category', 'loan_type', 'is_required', 'required')
    `);
    const columnNames = columns.rows.map(row => row.column_name);
    hasNameColumn = columnNames.includes('name');
    hasCategoryColumn = columnNames.includes('category');
    hasLoanTypeColumn = columnNames.includes('loan_type');
    hasIsRequiredColumn = columnNames.includes('is_required');
    hasRequiredColumn = columnNames.includes('required');
  } catch (error) {
    console.error('[createDocumentFoldersForLoan] Error checking columns:', error);
  }

  // Get loan to determine loan_type
  const loanResult = await db.query('SELECT transaction_type, loan_product FROM loan_requests WHERE id = $1', [loanId]);
  const loanType = loanResult.rows[0]?.transaction_type || loanResult.rows[0]?.loan_product || 'general';

  for (const folder of folders) {
    // Determine category based on folder name
    let category = 'general';
    if (folder.name.includes('income') || folder.name.includes('tax') || folder.name.includes('bank')) {
      category = 'financial';
    } else if (folder.name.includes('property') || folder.name.includes('lease') || folder.name.includes('rent')) {
      category = 'property';
    } else if (folder.name.includes('identification') || folder.name.includes('entity')) {
      category = 'identity';
    }

    // Build INSERT statement dynamically to include all required columns
    try {
      const columns = ['loan_id'];
      const values = [loanId];
      const placeholders = ['$1'];
      let paramIndex = 1;

      // Include NOT NULL columns if they exist
      if (hasNameColumn) {
        columns.push('name');
        values.push(folder.name);
        placeholders.push(`$${++paramIndex}`);
      }
      if (hasCategoryColumn) {
        columns.push('category');
        values.push(category);
        placeholders.push(`$${++paramIndex}`);
      }
      if (hasLoanTypeColumn) {
        columns.push('loan_type');
        values.push(loanType);
        placeholders.push(`$${++paramIndex}`);
      }
      if (hasIsRequiredColumn) {
        columns.push('is_required');
        values.push(false); // Folders are not required by default
        placeholders.push(`$${++paramIndex}`);
      }
      
      // Include standard columns
      columns.push('document_type', 'folder_name', 'description', 'status');
      values.push(`Folder: ${folder.name}`, folder.name, folder.description, 'pending');
      placeholders.push(`$${++paramIndex}`, `$${++paramIndex}`, `$${++paramIndex}`, `$${++paramIndex}`);
      
      // Only include 'required' column if it exists
      if (hasRequiredColumn) {
        columns.push('required');
        values.push(false);
        placeholders.push(`$${++paramIndex}`);
      }

      const query = `
        INSERT INTO needs_list_items (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        ON CONFLICT DO NOTHING
      `;
      
      await db.query(query, values);
    } catch (insertError) {
      console.error('[createDocumentFoldersForLoan] Insert error for folder:', folder.name, insertError.message);
      throw insertError;
    }
  }
}


module.exports = router;
