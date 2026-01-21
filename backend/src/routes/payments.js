const express = require('express');
const db = require('../db/config');
const { requireClerkAuth } = require('../middleware/clerkAuth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// Initialize Stripe (mock for development)
const stripe = process.env.STRIPE_SECRET_KEY 
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// Get payment status for a loan
router.get('/loan/:loanId', requireClerkAuth, async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT * FROM payments WHERE loan_id = $1 ORDER BY created_at DESC
    `, [req.params.loanId]);

    res.json({ payments: result.rows });
  } catch (error) {
    next(error);
  }
});

// Create appraisal payment intent (Step 8)
router.post('/appraisal-intent', requireClerkAuth, async (req, res, next) => {
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
router.post('/confirm', requireClerkAuth, async (req, res, next) => {
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

module.exports = router;
