const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/config');
const { generateToken, authenticate } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { sendWelcomeEmail } = require('../services/emailService');

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

  // Get loan to determine loan_type
  const loanResult = await db.query('SELECT transaction_type, loan_product FROM loan_requests WHERE id = $1', [loanId]);
  const loanType = loanResult.rows[0]?.transaction_type || loanResult.rows[0]?.loan_product || 'general';

  // Create a placeholder needs_list_item for each folder to make it appear in the UI
  for (const folder of folders) {
    // Determine category based on folder name (for categorization)
    let category = 'general';
    if (folder.name.includes('Financial') || folder.name.includes('Statement')) {
      category = 'financial';
    } else if (folder.name.includes('Property') || folder.name.includes('Rent') || folder.name.includes('Leases')) {
      category = 'property';
    } else if (folder.name.includes('Entity') || folder.name.includes('Insurance')) {
      category = 'identity';
    }

    // Build INSERT statement - use columns that exist in the table
    // Based on schema: name (NOT NULL), category (NOT NULL), loan_type (NOT NULL), is_required (NOT NULL)
    // Use category as folder identifier (folder name), name as display name
    const columns = ['loan_id', 'name', 'category', 'description', 'loan_type', 'is_required'];
    const values = [
      loanId,
      folder.name,           // name column - display name
      folder.name,           // category column - use folder name as category/folder identifier
      folder.description || '',    // description (can be empty)
      loanType,              // loan_type
      true                   // is_required
    ];
    const placeholders = ['$1', '$2', '$3', '$4', '$5', '$6'];

    const query = `
      INSERT INTO needs_list_items (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
    `;
    
    try {
      await db.query(query, values);
    } catch (insertError) {
      // Log error but don't fail registration if folder creation fails
      console.error(`[createDocumentFoldersForLoan] Failed to create folder "${folder.name}":`, insertError.message);
      // Continue with next folder
    }
  }
}

const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email address'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').trim().isLength({ min: 2 }).withMessage('Full name must be at least 2 characters'),
  body('phone').trim().isLength({ min: 10 }).withMessage('Phone number must be at least 10 characters'),
  body('propertyAddress').trim().notEmpty().withMessage('Property address is required'),
  body('propertyCity').trim().notEmpty().withMessage('Property city is required'),
  body('propertyState').trim().notEmpty().withMessage('Property state is required'),
  body('propertyZip').trim().isLength({ min: 5 }).withMessage('ZIP code must be at least 5 characters')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register new borrower (with initial loan request)
router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('[Register] Validation errors:', errors.array());
      console.error('[Register] Request body:', req.body);
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { 
      email, password, fullName, phone,
      propertyAddress, propertyCity, propertyState, propertyZip, propertyName 
    } = req.body;

    // Check if user exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userResult = await db.query(`
      INSERT INTO users (email, password_hash, full_name, phone, role)
      VALUES ($1, $2, $3, $4, 'borrower')
      RETURNING id, email, full_name, phone, role
    `, [email, passwordHash, fullName, phone]);

    const user = userResult.rows[0];

    // Create CRM profile
    const crmProfileId = uuidv4();
    await db.query(`
      INSERT INTO crm_profiles (id, user_id)
      VALUES ($1, $2)
    `, [crmProfileId, user.id]);

    // Generate loan number
    const loanCount = await db.query('SELECT COUNT(*) FROM loan_requests');
    const loanNumber = `RPC-${new Date().getFullYear()}-${String(parseInt(loanCount.rows[0].count) + 1).padStart(4, '0')}`;

    // Generate loan ID
    const loanId = uuidv4();
    
    // Create initial loan request (Step 1)
    const loanResult = await db.query(`
      INSERT INTO loan_requests (
        id, user_id, loan_number, property_address, property_city, property_state, property_zip, property_name,
        status, current_step
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new_request', 1)
      RETURNING id, loan_number
    `, [loanId, user.id, loanNumber, propertyAddress, propertyCity, propertyState, propertyZip, propertyName || null]);

    const loan = loanResult.rows[0];

    // Log initial status
    const statusHistoryId = uuidv4();
    await db.query(`
      INSERT INTO loan_status_history (id, loan_id, status, step, changed_by, notes)
      VALUES ($1, $2, 'new_request', 1, $3, 'Loan request initiated during registration')
    `, [statusHistoryId, loan.id, user.id]);

    // Create document folders automatically
    await createDocumentFoldersForLoan(loan.id);

    // Audit log (non-blocking - don't fail registration if audit fails)
    logAudit(user.id, 'USER_REGISTERED', 'user', user.id, req).catch(error => {
      console.error('Failed to log audit:', error);
    });

    // Send welcome email via HubSpot (non-blocking - don't fail registration if email fails)
    sendWelcomeEmail(
      { id: user.id, full_name: fullName, email },
      { id: loan.id, loan_number: loanNumber, property_address: propertyAddress, property_city: propertyCity, property_state: propertyState, property_zip: propertyZip }
    ).catch(error => {
      console.error('Failed to send welcome email:', error);
      // Don't throw - email failure shouldn't break registration
    });

    // Automatically send verification email on registration
    const verificationToken = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    // Get frontend URL from request - prioritize client's actual host
    const getFrontendUrl = (req) => {
      // 1. Check if frontend URL is explicitly sent in request body/headers
      const clientUrl = req.body?.frontendUrl || req.headers['x-frontend-url'];
      if (clientUrl) return clientUrl;
      
      // 2. Use FRONTEND_URL from env if set
      if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
      
      // 3. Try Origin header (most reliable for CORS requests)
      const origin = req.get('origin');
      if (origin) return origin;
      
      // 4. Try Referer header
      const referer = req.get('referer');
      if (referer) {
        try {
          const url = new URL(referer);
          return `${url.protocol}//${url.host}`;
        } catch (e) {
          // Continue to next option
        }
      }
      
      // 5. Try to extract from X-Forwarded-Host (if behind proxy)
      const forwardedHost = req.get('x-forwarded-host');
      const forwardedProto = req.get('x-forwarded-proto') || req.protocol;
      if (forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`;
      }
      
      // 6. Last resort: use request host but replace port if FRONTEND_PORT is set
      const host = req.get('host');
      const hostWithoutPort = host.replace(/:\d+$/, '');
      const port = process.env.FRONTEND_PORT || '8080';
      return `${req.protocol}://${hostWithoutPort}:${port}`;
    };
    const frontendUrl = getFrontendUrl(req);
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    
    // Store token
    await db.query(`
      INSERT INTO email_verification_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()
    `, [user.id, verificationToken, expiresAt]).catch(error => {
      console.error('Failed to create verification token:', error);
    });

    // Queue verification email
    const emailQueueId = uuidv4();
    await db.query(`
      INSERT INTO email_queue (id, user_id, email_type, recipient_email, subject, template_data, status)
      VALUES ($1, $2, 'email_verification', $3, 'Verify Your Email - RPC Lending', $4, 'pending')
    `, [emailQueueId, user.id, email, JSON.stringify({
      fullName: fullName,
      verificationUrl
    })]).catch(error => {
      console.error('Failed to queue verification email:', error);
    });

    // In development, log the verification URL
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📧 EMAIL VERIFICATION LINK (Development Mode):');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Verification URL: ${verificationUrl}`);
      console.log(`Token: ${verificationToken}`);
      console.log('═══════════════════════════════════════════════════════════\n');
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role
      },
      loan: {
        id: loan.id,
        loanNumber: loan.loan_number
      },
      // In development, include verification URL for testing
      ...(process.env.NODE_ENV !== 'production' && { verificationUrl })
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', loginValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Normalize email (same as validation)
    const normalizedEmail = email.toLowerCase().trim();

    const result = await db.query(`
      SELECT id, email, password_hash, full_name, phone, role, is_active, email_verified
      FROM users WHERE LOWER(TRIM(email)) = $1
    `, [normalizedEmail]);

    if (result.rows.length === 0) {
      // Log for debugging (only in development)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Login] User not found: ${normalizedEmail}`);
      }
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'No account found with this email address'
      });
    }

    const user = result.rows[0];

    // Only block if is_active is explicitly false (not null)
    if (user.is_active === false) {
      return res.status(401).json({ 
        error: 'Account is deactivated',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check if user has a password hash (users created via Clerk might not have one)
    if (!user.password_hash) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Login] User ${user.email} has no password hash - may have been created via Clerk`);
      }
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'This account was created with a different authentication method. Please use the sign-in method you used to create the account.'
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      // Log for debugging (only in development)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Login] Invalid password for: ${user.email}`);
        console.log(`[Login] Password provided: ${password ? 'Yes' : 'No'}`);
        console.log(`[Login] Password hash exists: ${user.password_hash ? 'Yes' : 'No'}`);
      }
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Incorrect password. Please try again.'
      });
    }

    await logAudit(user.id, 'USER_LOGIN', 'user', user.id, req);

    const token = generateToken(user.id);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get current user (JWT authentication only)
router.get('/me', authenticate, async (req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  console.log("=".repeat(80));
  console.log(`🚀 [${requestId}] Express /api/auth/me route handler called`);
  console.log(`📋 [${requestId}] Request details:`, {
    method: req.method,
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    userId: req.user?.id,
    userEmail: req.user?.email,
  });

  try {
    const user = req.user; // User is already authenticated by middleware

    if (!user) {
      console.error(`❌ [${requestId}] No user authenticated`);
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Invalid or expired token. Please sign in again.',
        code: 'AUTH_REQUIRED'
      });
    }

    console.log(`✅ [${requestId}] JWT authentication successful:`, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    console.log(`🔍 [${requestId}] Fetching profile and loan count for user: ${user.id}`);

    // Get additional profile data including profile_image_url
    let profile, loanCount, userData;
    try {
      // Get user data including profile_image_url
      userData = await db.query(`
        SELECT id, email, full_name, phone, role, profile_image_url
        FROM users WHERE id = $1
      `, [user.id]);

      profile = await db.query(`
        SELECT cp.* FROM crm_profiles cp WHERE cp.user_id = $1
      `, [user.id]);

      loanCount = await db.query(`
        SELECT COUNT(*) as count FROM loan_requests WHERE user_id = $1
      `, [user.id]);
      
      console.log(`✅ [${requestId}] Profile and loan count fetched:`, {
        hasProfile: profile.rows.length > 0,
        loanCount: loanCount.rows[0]?.count,
      });
    } catch (dbError) {
      console.error(`❌ [${requestId}] Database error fetching profile:`, {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail,
        stack: dbError.stack,
      });
      // Return user data even if profile/loan count fails
      userData = { rows: [{ id: user.id, email: user.email, full_name: user.full_name, phone: user.phone, role: user.role, profile_image_url: null }] };
      profile = { rows: [] };
      loanCount = { rows: [{ count: '0' }] };
    }

    const userRow = userData.rows[0] || user;

    const responseData = {
      user: {
        id: userRow.id,
        email: userRow.email,
        fullName: userRow.full_name,
        phone: userRow.phone,
        role: userRow.role,
        // email_verified is a timestamp, convert to boolean for frontend
        email_verified: !!user.email_verified,
        // Include profile_image_url and map to image_url for frontend compatibility
        profile_image_url: userRow.profile_image_url,
        image_url: userRow.profile_image_url
      },
      profile: profile.rows[0] || null,
      loanCount: parseInt(loanCount.rows[0]?.count || 0)
    };

    const duration = Date.now() - startTime;
    console.log(`✅ [${requestId}] Express /api/auth/me completed successfully in ${duration}ms`);
    console.log(`📋 [${requestId}] Response data:`, {
      userId: responseData.user.id,
      userRole: responseData.user.role,
      hasProfile: !!responseData.profile,
      loanCount: responseData.loanCount,
    });
    console.log("=".repeat(80));

    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("=".repeat(80));
    console.error(`❌ [${requestId}] Express /api/auth/me unexpected error (after ${duration}ms):`);
    console.error(`❌ [${requestId}] Error name:`, error.name);
    console.error(`❌ [${requestId}] Error message:`, error.message);
    console.error(`❌ [${requestId}] Error code:`, error.code);
    console.error(`❌ [${requestId}] Error stack:`, error.stack);
    if (error.detail) console.error(`❌ [${requestId}] Error detail:`, error.detail);
    if (error.hint) console.error(`❌ [${requestId}] Error hint:`, error.hint);
    console.error("=".repeat(80));
    next(error);
  }
});

// Change password
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    const result = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

    await logAudit(req.user.id, 'PASSWORD_CHANGED', 'user', req.user.id, req);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Email verification endpoints
// Send verification email
router.post('/verify-email/send', authenticate, async (req, res, next) => {
  try {
    const user = req.user;
    
    // Check if already verified
    if (user.email_verified) {
      return res.json({ message: 'Email already verified' });
    }

    // Generate verification token
    const verificationToken = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in database
    await db.query(`
      INSERT INTO email_verification_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()
    `, [user.id, verificationToken, expiresAt]);

    // Send verification email
    // Get frontend URL from request - prioritize client's actual host
    const getFrontendUrl = (req) => {
      // 1. Check if frontend URL is explicitly sent in request body/headers
      const clientUrl = req.body?.frontendUrl || req.headers['x-frontend-url'];
      if (clientUrl) return clientUrl;
      
      // 2. Use FRONTEND_URL from env if set
      if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
      
      // 3. Try Origin header (most reliable for CORS requests)
      const origin = req.get('origin');
      if (origin) return origin;
      
      // 4. Try Referer header
      const referer = req.get('referer');
      if (referer) {
        try {
          const url = new URL(referer);
          return `${url.protocol}//${url.host}`;
        } catch (e) {
          // Continue to next option
        }
      }
      
      // 5. Try to extract from X-Forwarded-Host (if behind proxy)
      const forwardedHost = req.get('x-forwarded-host');
      const forwardedProto = req.get('x-forwarded-proto') || req.protocol;
      if (forwardedHost) {
        return `${forwardedProto}://${forwardedHost}`;
      }
      
      // 6. Last resort: use request host but replace port if FRONTEND_PORT is set
      const host = req.get('host');
      const hostWithoutPort = host.replace(/:\d+$/, '');
      const port = process.env.FRONTEND_PORT || '8080';
      return `${req.protocol}://${hostWithoutPort}:${port}`;
    };
    const frontendUrl = getFrontendUrl(req);
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
    
    // Queue email
    const emailQueueId = uuidv4();
    await db.query(`
      INSERT INTO email_queue (id, user_id, email_type, recipient_email, subject, template_data, status)
      VALUES ($1, $2, 'email_verification', $3, 'Verify Your Email - RPC Lending', $4, 'pending')
    `, [emailQueueId, user.id, user.email, JSON.stringify({
      fullName: user.full_name,
      verificationUrl
    })]);

    // In development, log the verification URL for easy testing
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n📧 EMAIL VERIFICATION LINK (Development Mode):');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`Verification URL: ${verificationUrl}`);
      console.log(`Token: ${verificationToken}`);
      console.log('═══════════════════════════════════════════════════════════\n');
    }

    res.json({ 
      message: 'Verification email sent',
      // In development, also return the URL for testing
      ...(process.env.NODE_ENV !== 'production' && { verificationUrl })
    });
  } catch (error) {
    next(error);
  }
});

// Verify email with token
router.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    // Check token
    const tokenCheck = await db.query(`
      SELECT user_id, expires_at FROM email_verification_tokens
      WHERE token = $1 AND expires_at > NOW()
    `, [token]);

    if (tokenCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const userId = tokenCheck.rows[0].user_id;

    // Mark email as verified (email_verified is a timestamp column)
    await db.query(`
      UPDATE users SET email_verified = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [userId]);

    // Delete used token
    await db.query(`
      DELETE FROM email_verification_tokens WHERE token = $1
    `, [token]);

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
