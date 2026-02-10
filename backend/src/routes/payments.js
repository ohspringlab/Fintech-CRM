const express = require('express');
const db = require('../db/config');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// Initialize Stripe (mock for development)
const stripe = process.env.STRIPE_SECRET_KEY 
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// Get payment status for a loan
router.get('/loan/:loanId', authenticate, async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT * FROM payments WHERE loan_id = $1 ORDER BY created_at DESC
    `, [req.params.loanId]);

    res.json({ payments: result.rows });
  } catch (error) {
    next(error);
  }
});

// Create appraisal payment intent (STEP 7 - Authorization before term sheet signing)
router.post('/appraisal-intent', authenticate, async (req, res, next) => {
  try {
    const { loanId } = req.body;

    // Verify loan ownership
    const loanCheck = await db.query(
      'SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2',
      [loanId, req.user.id]
    );

    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanCheck.rows[0];

    // STEP 6: Check if formal term sheet is issued (must complete application and pay fees first)
    if (!loan.term_sheet_url) {
      return res.status(400).json({ 
        error: 'Formal term sheet must be generated first',
        message: 'Complete your application and pay the required fees to generate the formal term sheet before authorizing appraisal payment.'
      });
    }

    if (loan.appraisal_paid) {
      return res.status(400).json({ error: 'Appraisal already paid' });
    }

    // Appraisal fee (could be dynamic based on property type)
    const appraisalAmount = loan.property_type === 'commercial' ? 75000 : 50000; // in cents (750.00 or 500.00)

    // Try Stripe first, fall back to mock if Stripe is not configured or fails
    if (stripe) {
      try {
        // Create Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create({
          amount: appraisalAmount,
          currency: 'usd',
          metadata: {
            loanId,
            paymentType: 'appraisal',
            loanNumber: loan.loan_number
          }
        });

        // Check which columns exist in payments table
        let hasUserIdColumn = false;
        let hasPaymentTypeColumn = false;
        let hasStripePaymentIntentColumn = false;
        let hasClientIdColumn = false;
        let hasTypeColumn = false;
        try {
          const columnCheck = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'payments' 
            AND column_name IN ('user_id', 'payment_type', 'stripe_payment_intent', 'client_id', 'type')
          `);
          const columnNames = columnCheck.rows.map(row => row.column_name.toLowerCase());
          hasUserIdColumn = columnNames.includes('user_id');
          hasPaymentTypeColumn = columnNames.includes('payment_type');
          hasStripePaymentIntentColumn = columnNames.includes('stripe_payment_intent');
          hasClientIdColumn = columnNames.includes('client_id');
          hasTypeColumn = columnNames.includes('type');
          
          // Log for debugging
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Appraisal Payment] Column check results:', {
              hasUserIdColumn,
              hasPaymentTypeColumn,
              hasStripePaymentIntentColumn,
              hasClientIdColumn,
              hasTypeColumn,
              availableColumns: columnNames
            });
          }
        } catch (error) {
          console.error('Error checking for columns:', error);
          // Don't fail completely, just log the error
        }

        // Build INSERT statement dynamically based on available columns
        const columns = ['loan_id'];
        const values = [loanId];
        const placeholders = ['$1'];
        let paramIndex = 1;

        if (hasUserIdColumn) {
          columns.push('user_id');
          values.push(req.user.id);
          placeholders.push(`$${++paramIndex}`);
        }
        if (hasClientIdColumn) {
          // Use user_id as client_id if client_id column exists
          columns.push('client_id');
          values.push(req.user.id);
          placeholders.push(`$${++paramIndex}`);
        }
        if (hasPaymentTypeColumn) {
          columns.push('payment_type');
          values.push('appraisal');
          placeholders.push(`$${++paramIndex}`);
        }
        if (hasTypeColumn) {
          // type column (alternative to payment_type)
          columns.push('type');
          values.push('appraisal');
          placeholders.push(`$${++paramIndex}`);
        }
        columns.push('amount');
        values.push(appraisalAmount / 100);
        placeholders.push(`$${++paramIndex}`);
        
        if (hasStripePaymentIntentColumn) {
          columns.push('stripe_payment_intent');
          values.push(paymentIntent.id);
          placeholders.push(`$${++paramIndex}`);
        }
        
        columns.push('status');
        values.push('pending');
        placeholders.push(`$${++paramIndex}`);
        
        // Check if created_at column exists and include it if it does
        // (Some schemas may require it explicitly even if there's a default)
        let hasCreatedAtColumn = false;
        try {
          const createdAtCheck = await db.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'created_at'
          `);
          hasCreatedAtColumn = createdAtCheck.rows.length > 0;
        } catch (error) {
          console.warn('Error checking for created_at column:', error);
        }
        
        if (hasCreatedAtColumn) {
          columns.push('created_at');
          values.push(new Date());
          placeholders.push(`$${++paramIndex}`);
        }

        // Record pending payment
        try {
          await db.query(`
            INSERT INTO payments (${columns.join(', ')})
            VALUES (${placeholders.join(', ')})
          `, values);
        } catch (insertError) {
          console.error('[Appraisal Payment] INSERT error:', insertError.message);
          console.error('[Appraisal Payment] Columns being inserted:', columns);
          console.error('[Appraisal Payment] Values:', values);
          // If the error is about a missing column, provide a helpful message
          if (insertError.message.includes('does not exist')) {
            throw new Error(`Database schema mismatch: ${insertError.message}. Please run migrations to update the payments table.`);
          }
          throw insertError;
        }

        res.json({
          clientSecret: paymentIntent.client_secret,
          amount: appraisalAmount / 100
        });
        return;
      } catch (stripeError) {
        // If Stripe fails (invalid key, etc.), fall back to mock mode
        console.warn('Stripe payment intent creation failed, using mock mode:', stripeError.message);
        // Continue to mock mode below
      }
    }
    
    // Mock payment for development (or fallback if Stripe fails)
    const mockIntentId = `pi_mock_${Date.now()}`;
    
    // Check which columns exist in payments table
    let hasUserIdColumn = false;
    let hasPaymentTypeColumn = false;
    let hasStripePaymentIntentColumn = false;
    let hasClientIdColumn = false;
    let hasTypeColumn = false;
    try {
      const columnCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name IN ('user_id', 'payment_type', 'stripe_payment_intent', 'client_id', 'type')
      `);
      const columnNames = columnCheck.rows.map(row => row.column_name.toLowerCase());
      hasUserIdColumn = columnNames.includes('user_id');
      hasPaymentTypeColumn = columnNames.includes('payment_type');
      hasStripePaymentIntentColumn = columnNames.includes('stripe_payment_intent');
      hasClientIdColumn = columnNames.includes('client_id');
      hasTypeColumn = columnNames.includes('type');
    } catch (error) {
      console.warn('Error checking for columns:', error);
    }

    // Build INSERT statement dynamically based on available columns
    const columns = ['loan_id'];
    const values = [loanId];
    const placeholders = ['$1'];
    let paramIndex = 1;

    if (hasUserIdColumn) {
      columns.push('user_id');
      values.push(req.user.id);
      placeholders.push(`$${++paramIndex}`);
    }
    if (hasClientIdColumn) {
      // Use user_id as client_id if client_id column exists
      columns.push('client_id');
      values.push(req.user.id);
      placeholders.push(`$${++paramIndex}`);
    }
    if (hasPaymentTypeColumn) {
      columns.push('payment_type');
      values.push('appraisal');
      placeholders.push(`$${++paramIndex}`);
    }
    if (hasTypeColumn) {
      // type column (alternative to payment_type)
      columns.push('type');
      values.push('appraisal');
      placeholders.push(`$${++paramIndex}`);
    }
    columns.push('amount');
    values.push(appraisalAmount / 100);
    placeholders.push(`$${++paramIndex}`);
    
    if (hasStripePaymentIntentColumn) {
      columns.push('stripe_payment_intent');
      values.push(mockIntentId);
      placeholders.push(`$${++paramIndex}`);
    }
    
    columns.push('status');
    values.push('pending');
    placeholders.push(`$${++paramIndex}`);
    
    // Check if created_at column exists and include it if it does
    // (Some schemas may require it explicitly even if there's a default)
    let hasCreatedAtColumn = false;
    try {
      const createdAtCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'created_at'
      `);
      hasCreatedAtColumn = createdAtCheck.rows.length > 0;
    } catch (error) {
      console.warn('Error checking for created_at column:', error);
    }
    
    if (hasCreatedAtColumn) {
      columns.push('created_at');
      values.push(new Date());
      placeholders.push(`$${++paramIndex}`);
    }

    try {
      await db.query(`
        INSERT INTO payments (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
      `, values);
    } catch (insertError) {
      console.error('[Appraisal Payment - Mock] INSERT error:', insertError.message);
      console.error('[Appraisal Payment - Mock] Columns being inserted:', columns);
      console.error('[Appraisal Payment - Mock] Values:', values);
      // If the error is about a missing column, provide a helpful message
      if (insertError.message.includes('does not exist')) {
        throw new Error(`Database schema mismatch: ${insertError.message}. Please run migrations to update the payments table.`);
      }
      throw insertError;
    }

    res.json({
      clientSecret: `mock_secret_${mockIntentId}`,
      amount: appraisalAmount / 100,
      mockMode: true
    });
  } catch (error) {
    next(error);
  }
});

// Confirm payment (for mock/development)
router.post('/confirm', authenticate, async (req, res, next) => {
  try {
    const { loanId, paymentIntentId } = req.body;

    // Check if columns exist
    let hasStripePaymentIntentColumn = false;
    let hasStripePaymentIdColumn = false;
    let hasPaidAtColumn = false;
    try {
      const columnCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name IN ('stripe_payment_intent', 'stripe_payment_id', 'paid_at')
      `);
      const columnNames = columnCheck.rows.map(row => row.column_name.toLowerCase());
      hasStripePaymentIntentColumn = columnNames.includes('stripe_payment_intent');
      hasStripePaymentIdColumn = columnNames.includes('stripe_payment_id');
      hasPaidAtColumn = columnNames.includes('paid_at');
    } catch (error) {
      console.warn('Error checking for columns:', error);
    }

    // Build WHERE clause dynamically
    let whereClause = 'loan_id = $1';
    let whereParams = [loanId];
    let paramIndex = 1;

    if (hasStripePaymentIntentColumn) {
      whereClause += ` AND stripe_payment_intent = $${++paramIndex}`;
      whereParams.push(paymentIntentId);
    } else if (hasStripePaymentIdColumn) {
      whereClause += ` AND stripe_payment_id = $${++paramIndex}`;
      whereParams.push(paymentIntentId);
    } else {
      // Fallback: use paymentIntentId as a general identifier if neither column exists
      // This shouldn't happen in normal operation, but handle gracefully
      whereClause += ` AND id::text = $${++paramIndex}`;
      whereParams.push(paymentIntentId);
    }

    // Build SET clause dynamically based on available columns
    let setClause = 'status = $' + (whereParams.length + 1);
    whereParams.push('completed');
    
    if (hasPaidAtColumn) {
      setClause += ', paid_at = NOW()';
    }

    // Update payment status
    await db.query(`
      UPDATE payments SET ${setClause}
      WHERE ${whereClause}
    `, whereParams);

    // Update loan
    await db.query(`
      UPDATE loan_requests SET
        appraisal_paid = true,
        appraisal_payment_id = $1,
        current_step = GREATEST(current_step, 8),
        updated_at = NOW()
      WHERE id = $2
    `, [paymentIntentId, loanId]);

    const statusHistoryId = require('uuid').v4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'appraisal_paid', 8, $3, 'Appraisal payment completed')
    `, [statusHistoryId, loanId, req.user.id]);

    await logAudit(req.user.id, 'PAYMENT_COMPLETED', 'payment', loanId, req, {
      paymentType: 'appraisal',
      paymentIntentId
    });

    res.json({ message: 'Payment confirmed' });
  } catch (error) {
    next(error);
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(400).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const { loanId } = paymentIntent.metadata;

    // Check if columns exist
    let hasStripePaymentIntentColumn = false;
    let hasStripePaymentIdColumn = false;
    let hasPaidAtColumn = false;
    try {
      const columnCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name IN ('stripe_payment_intent', 'stripe_payment_id', 'paid_at')
      `);
      const columnNames = columnCheck.rows.map(row => row.column_name.toLowerCase());
      hasStripePaymentIntentColumn = columnNames.includes('stripe_payment_intent');
      hasStripePaymentIdColumn = columnNames.includes('stripe_payment_id');
      hasPaidAtColumn = columnNames.includes('paid_at');
    } catch (error) {
      console.warn('Error checking for columns in webhook:', error);
    }

    // Build WHERE clause dynamically
    let whereClause;
    if (hasStripePaymentIntentColumn) {
      whereClause = 'stripe_payment_intent = $1';
    } else if (hasStripePaymentIdColumn) {
      whereClause = 'stripe_payment_id = $1';
    } else {
      // Fallback: skip this update if neither column exists
      console.warn('Cannot update payment: neither stripe_payment_intent nor stripe_payment_id column exists');
      return res.json({ received: true });
    }

    // Build SET clause dynamically based on available columns
    let setClause = 'status = $2';
    const updateParams = [paymentIntent.id, 'completed'];
    
    if (hasPaidAtColumn) {
      setClause += ', paid_at = NOW()';
    }

    await db.query(`
      UPDATE payments SET ${setClause}
      WHERE ${whereClause}
    `, updateParams);

    await db.query(`
      UPDATE loan_requests SET
        appraisal_paid = true,
        appraisal_payment_id = $1,
        current_step = GREATEST(current_step, 8),
        updated_at = NOW()
      WHERE id = $2
    `, [paymentIntent.id, loanId]);
  }

  res.json({ received: true });
});

// Get payment status for a loan (all payment types)
router.get('/status/:loanId', authenticate, async (req, res, next) => {
  try {
    const loan = await db.query(
      'SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2',
      [req.params.loanId, req.user.id]
    );

    if (loan.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loanData = loan.rows[0];
    
    // Check which payment columns exist (handle missing columns gracefully)
    res.json({
      creditCheckPaid: loanData.credit_payment_id ? true : false,
      applicationFeePaid: loanData.application_fee_paid || false,
      underwritingFeePaid: loanData.underwriting_fee_paid || false,
      closingFeePaid: loanData.closing_fee_paid || false,
      appraisalPaid: loanData.appraisal_paid || false,
      creditPaymentId: loanData.credit_payment_id || null,
      applicationFeePaymentId: loanData.application_fee_payment_id || null,
      underwritingFeePaymentId: loanData.underwriting_fee_payment_id || null,
      closingFeePaymentId: loanData.closing_fee_payment_id || null,
      appraisalPaymentId: loanData.appraisal_payment_id || null
    });
  } catch (error) {
    next(error);
  }
});

// Credit check payment link (Step 4 - $50)
router.post('/credit-check-link', authenticate, async (req, res, next) => {
  try {
    const { loanId } = req.body;

    const loanCheck = await db.query(
      'SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2',
      [loanId, req.user.id]
    );

    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanCheck.rows[0];

    if (loan.credit_payment_id) {
      return res.status(400).json({ error: 'Credit check payment already completed' });
    }

    // Return Stripe payment link
    res.json({
      paymentLink: 'https://buy.stripe.com/bJe9AScAT5C9039dbz3oA01',
      amount: 50,
      type: 'credit_check',
      description: 'Soft Credit Check Fee (NON-REFUNDABLE)'
    });
  } catch (error) {
    next(error);
  }
});

// Confirm credit check payment (called after Stripe payment)
router.post('/confirm-credit-check', authenticate, async (req, res, next) => {
  try {
    const { loanId, paymentId } = req.body;

    const loanCheck = await db.query(
      'SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2',
      [loanId, req.user.id]
    );

    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Update loan with credit check payment
    await db.query(`
      UPDATE loan_requests SET
        credit_payment_id = $1,
        credit_payment_amount = 50,
        credit_authorized = true,
        credit_auth_timestamp = NOW(),
        updated_at = NOW()
      WHERE id = $2
    `, [paymentId, loanId]);

    // Record payment - check which columns exist
    let paymentColumns = ['loan_id', 'amount', 'status'];
    let paymentValues = [loanId, 50, 'completed'];
    let paymentPlaceholders = ['$1', '$2', '$3'];
    let paramIndex = 3;
    
    // Check for optional columns
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name IN ('user_id', 'payment_type', 'stripe_payment_id', 'description', 'type')
    `);
    const columnNames = columnCheck.rows.map(row => row.column_name.toLowerCase());
    
    if (columnNames.includes('user_id')) {
      paymentColumns.push('user_id');
      paymentValues.push(req.user.id);
      paymentPlaceholders.push(`$${++paramIndex}`);
    }
    if (columnNames.includes('payment_type')) {
      paymentColumns.push('payment_type');
      paymentValues.push('credit_check');
      paymentPlaceholders.push(`$${++paramIndex}`);
    } else if (columnNames.includes('type')) {
      paymentColumns.push('type');
      paymentValues.push('credit_check');
      paymentPlaceholders.push(`$${++paramIndex}`);
    }
    if (columnNames.includes('stripe_payment_id')) {
      paymentColumns.push('stripe_payment_id');
      paymentValues.push(paymentId);
      paymentPlaceholders.push(`$${++paramIndex}`);
    }
    
    await db.query(`
      INSERT INTO payments (${paymentColumns.join(', ')})
      VALUES (${paymentPlaceholders.join(', ')})
    `, paymentValues);

    await logAudit(req.user.id, 'CREDIT_CHECK_PAYMENT_COMPLETED', 'payment', loanId, req);

    res.json({ message: 'Credit check payment confirmed' });
  } catch (error) {
    next(error);
  }
});

// Application fee payment link (Step 5 - $495)
router.post('/application-fee-link', authenticate, async (req, res, next) => {
  try {
    const { loanId } = req.body;

    const loanCheck = await db.query(
      'SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2',
      [loanId, req.user.id]
    );

    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanCheck.rows[0];

    // Check if credit check payment was made
    if (!loan.credit_payment_id) {
      return res.status(400).json({ error: 'Credit check payment must be completed first' });
    }

    if (loan.application_fee_paid) {
      return res.status(400).json({ error: 'Application fee already paid' });
    }

    res.json({
      paymentLink: 'https://buy.stripe.com/test_application_fee', // Replace with actual Stripe link
      amount: 495,
      type: 'application_fee',
      description: 'Application Fee (NON-REFUNDABLE)'
    });
  } catch (error) {
    next(error);
  }
});

// Confirm application fee payment
router.post('/confirm-application-fee', authenticate, async (req, res, next) => {
  try {
    const { loanId, paymentId } = req.body;

    const loanCheck = await db.query(
      'SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2',
      [loanId, req.user.id]
    );

    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    await db.query(`
      UPDATE loan_requests SET
        application_fee_paid = true,
        application_fee_payment_id = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [paymentId, loanId]);

    // Record payment - use same dynamic column logic
    let paymentColumns = ['loan_id', 'amount', 'status'];
    let paymentValues = [loanId, 495, 'completed'];
    let paymentPlaceholders = ['$1', '$2', '$3'];
    let paramIndex = 3;
    
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name IN ('user_id', 'payment_type', 'stripe_payment_id', 'type')
    `);
    const columnNames = columnCheck.rows.map(row => row.column_name.toLowerCase());
    
    if (columnNames.includes('user_id')) {
      paymentColumns.push('user_id');
      paymentValues.push(req.user.id);
      paymentPlaceholders.push(`$${++paramIndex}`);
    }
    if (columnNames.includes('payment_type')) {
      paymentColumns.push('payment_type');
      paymentValues.push('application_fee');
      paymentPlaceholders.push(`$${++paramIndex}`);
    } else if (columnNames.includes('type')) {
      paymentColumns.push('type');
      paymentValues.push('application_fee');
      paymentPlaceholders.push(`$${++paramIndex}`);
    }
    if (columnNames.includes('stripe_payment_id')) {
      paymentColumns.push('stripe_payment_id');
      paymentValues.push(paymentId);
      paymentPlaceholders.push(`$${++paramIndex}`);
    }
    
    await db.query(`
      INSERT INTO payments (${paymentColumns.join(', ')})
      VALUES (${paymentPlaceholders.join(', ')})
    `, paymentValues);

    await logAudit(req.user.id, 'APPLICATION_FEE_PAYMENT_COMPLETED', 'payment', loanId, req);

    res.json({ message: 'Application fee payment confirmed' });
  } catch (error) {
    next(error);
  }
});

// Underwriting fee payment link (Step 9 - $1495)
router.post('/underwriting-fee-link', authenticate, async (req, res, next) => {
  try {
    const { loanId } = req.body;

    const loanCheck = await db.query(
      'SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2',
      [loanId, req.user.id]
    );

    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanCheck.rows[0];

    if (loan.underwriting_fee_paid) {
      return res.status(400).json({ error: 'Underwriting fee already paid' });
    }

    res.json({
      paymentLink: 'https://buy.stripe.com/3cI9AS8kD7Kh3fl9Zn3oA02',
      amount: 1495,
      type: 'underwriting_fee',
      description: 'Underwriting Fee (NON-REFUNDABLE)'
    });
  } catch (error) {
    next(error);
  }
});

// Confirm underwriting fee payment
router.post('/confirm-underwriting-fee', authenticate, async (req, res, next) => {
  try {
    const { loanId, paymentId } = req.body;

    const loanCheck = await db.query(
      'SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2',
      [loanId, req.user.id]
    );

    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    await db.query(`
      UPDATE loan_requests SET
        underwriting_fee_paid = true,
        underwriting_fee_payment_id = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [paymentId, loanId]);

    // Record payment - use same dynamic column logic
    let paymentColumns = ['loan_id', 'amount', 'status'];
    let paymentValues = [loanId, 1495, 'completed'];
    let paymentPlaceholders = ['$1', '$2', '$3'];
    let paramIndex = 3;
    
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name IN ('user_id', 'payment_type', 'stripe_payment_id', 'type')
    `);
    const columnNames = columnCheck.rows.map(row => row.column_name.toLowerCase());
    
    if (columnNames.includes('user_id')) {
      paymentColumns.push('user_id');
      paymentValues.push(req.user.id);
      paymentPlaceholders.push(`$${++paramIndex}`);
    }
    if (columnNames.includes('payment_type')) {
      paymentColumns.push('payment_type');
      paymentValues.push('underwriting_fee');
      paymentPlaceholders.push(`$${++paramIndex}`);
    } else if (columnNames.includes('type')) {
      paymentColumns.push('type');
      paymentValues.push('underwriting_fee');
      paymentPlaceholders.push(`$${++paramIndex}`);
    }
    if (columnNames.includes('stripe_payment_id')) {
      paymentColumns.push('stripe_payment_id');
      paymentValues.push(paymentId);
      paymentPlaceholders.push(`$${++paramIndex}`);
    }
    
    await db.query(`
      INSERT INTO payments (${paymentColumns.join(', ')})
      VALUES (${paymentPlaceholders.join(', ')})
    `, paymentValues);

    await logAudit(req.user.id, 'UNDERWRITING_FEE_PAYMENT_COMPLETED', 'payment', loanId, req);

    res.json({ message: 'Underwriting fee payment confirmed' });
  } catch (error) {
    next(error);
  }
});

// Closing fee payment link (Step 10 - dynamic amount)
router.post('/closing-fee-link', authenticate, async (req, res, next) => {
  try {
    const { loanId } = req.body;

    const loanCheck = await db.query(
      'SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2',
      [loanId, req.user.id]
    );

    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const loan = loanCheck.rows[0];

    if (loan.closing_fee_paid) {
      return res.status(400).json({ error: 'Closing fee already paid' });
    }

    // Calculate closing fee (could be dynamic based on loan amount)
    const closingFee = 2000; // Default, could be calculated

    res.json({
      paymentLink: 'https://buy.stripe.com/8x24gydEXfcJ3fl0oN3oA03',
      amount: closingFee,
      type: 'closing_fee',
      description: 'Closing Fee (NON-REFUNDABLE)'
    });
  } catch (error) {
    next(error);
  }
});

// Confirm closing fee payment
router.post('/confirm-closing-fee', authenticate, async (req, res, next) => {
  try {
    const { loanId, paymentId, amount } = req.body;

    const loanCheck = await db.query(
      'SELECT * FROM loan_requests WHERE id = $1 AND user_id = $2',
      [loanId, req.user.id]
    );

    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    await db.query(`
      UPDATE loan_requests SET
        closing_fee_paid = true,
        closing_fee_payment_id = $1,
        closing_fee_amount = $2,
        updated_at = NOW()
      WHERE id = $3
    `, [paymentId, amount || 2000, loanId]);

    // Record payment - use same dynamic column logic
    let paymentColumns = ['loan_id', 'amount', 'status'];
    let paymentValues = [loanId, amount || 2000, 'completed'];
    let paymentPlaceholders = ['$1', '$2', '$3'];
    let paramIndex = 3;
    
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name IN ('user_id', 'payment_type', 'stripe_payment_id', 'type')
    `);
    const columnNames = columnCheck.rows.map(row => row.column_name.toLowerCase());
    
    if (columnNames.includes('user_id')) {
      paymentColumns.push('user_id');
      paymentValues.push(req.user.id);
      paymentPlaceholders.push(`$${++paramIndex}`);
    }
    if (columnNames.includes('payment_type')) {
      paymentColumns.push('payment_type');
      paymentValues.push('closing_fee');
      paymentPlaceholders.push(`$${++paramIndex}`);
    } else if (columnNames.includes('type')) {
      paymentColumns.push('type');
      paymentValues.push('closing_fee');
      paymentPlaceholders.push(`$${++paramIndex}`);
    }
    if (columnNames.includes('stripe_payment_id')) {
      paymentColumns.push('stripe_payment_id');
      paymentValues.push(paymentId);
      paymentPlaceholders.push(`$${++paramIndex}`);
    }
    
    await db.query(`
      INSERT INTO payments (${paymentColumns.join(', ')})
      VALUES (${paymentPlaceholders.join(', ')})
    `, paymentValues);

    await logAudit(req.user.id, 'CLOSING_FEE_PAYMENT_COMPLETED', 'payment', loanId, req);

    res.json({ message: 'Closing fee payment confirmed' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
