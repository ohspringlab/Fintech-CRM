// Clerk authentication middleware for Express
const { createClerkClient } = require('@clerk/backend');
const { getAuth } = require('@clerk/express');

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// Middleware to verify Clerk session and sync user to database
const requireClerkAuth = async (req, res, next) => {
  try {
    // Check if Clerk is configured
    if (!process.env.CLERK_SECRET_KEY) {
      console.error('❌ CLERK_SECRET_KEY not configured');
      return res.status(500).json({ 
        error: 'Authentication service not configured',
        message: 'Clerk secret key is missing'
      });
    }

    // Debug: Log the authorization header
    const authHeader = req.headers.authorization;
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔐 Auth attempt:', {
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader?.substring(0, 20),
        path: req.path
      });
    }

    // Get Clerk session from request
    let authResult;
    try {
      authResult = getAuth(req);
    } catch (getAuthError) {
      console.error('❌ Error getting Clerk auth:', getAuthError);
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = authResult?.userId;
    const sessionId = authResult?.sessionId;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔐 Clerk auth result:', {
        userId: userId ? userId.substring(0, 10) + '...' : 'none',
        sessionId: sessionId ? sessionId.substring(0, 10) + '...' : 'none',
        hasUserId: !!userId
      });
    }
    
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('❌ No userId found in Clerk auth');
      }
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user from Clerk
    let clerkUser;
    try {
      clerkUser = await clerkClient.users.getUser(userId);
    } catch (clerkError) {
      console.error('❌ Error fetching user from Clerk:', clerkError);
      return res.status(401).json({ 
        error: 'Authentication failed',
        message: 'Unable to verify user with authentication service'
      });
    }
    
    if (!clerkUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if email is verified in Clerk
    const emailVerified = clerkUser.emailAddresses?.some(
      email => email.emailAddress === clerkUser.primaryEmailAddress?.emailAddress && email.verification?.status === 'verified'
    ) || false;
    
    // Convert boolean to timestamp for database (email_verified is a timestamp column)
    const emailVerifiedTimestamp = emailVerified ? new Date() : null;

    // Sync user to database (create or update) - this replaces webhook functionality
    const db = require('../db/config');
    
    // Check if user exists by Clerk ID or email
    let userResult;
    try {
      userResult = await db.query(
        `SELECT id, email, full_name, phone, role, is_active, email_verified 
         FROM users 
         WHERE id = $1 OR email = $2`,
        [userId, clerkUser.primaryEmailAddress?.emailAddress]
      );
    } catch (dbError) {
      console.error('❌ Database error in Clerk auth:', dbError);
      return res.status(500).json({ 
        error: 'Database error',
        message: 'Unable to access user database'
      });
    }

    let user;
    if (userResult.rows.length > 0) {
      // User exists - update their Clerk ID if it's a legacy user migrating to Clerk
      user = userResult.rows[0];
      
      // If this is a legacy user (different ID), update their ID to Clerk ID
      if (user.id !== userId) {
        console.log(`[Clerk Auth] Migrating legacy user ${user.email} (${user.role}) to Clerk ID: ${userId}`);
        await db.query(
          `UPDATE users SET id = $1 WHERE email = $2`,
          [userId, clerkUser.primaryEmailAddress?.emailAddress]
        );
        user.id = userId; // Update the in-memory user object with new Clerk ID
      }
      
      // Update existing user with latest Clerk data (but preserve their role)
      await db.query(
        `UPDATE users 
         SET email = $1, 
             full_name = $2,
             phone = $3,
             email_verified = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [
          clerkUser.primaryEmailAddress?.emailAddress,
          clerkUser.firstName && clerkUser.lastName 
            ? `${clerkUser.firstName} ${clerkUser.lastName}`
            : clerkUser.username || user.full_name || 'User',
          clerkUser.phoneNumbers?.[0]?.phoneNumber || user.phone || '',
          emailVerifiedTimestamp,
          userId
        ]
      );
      
      // Refresh user data with the updated values
      const updatedResult = await db.query(
        `SELECT id, email, full_name, phone, role, is_active, email_verified 
         FROM users 
         WHERE id = $1`,
        [userId]
      );
      user = updatedResult.rows[0];
      
      console.log(`[Clerk Auth] User authenticated: ${user.email} (role: ${user.role})`);
    } else {
      // Create new user from Clerk data (password_hash can be NULL for Clerk users)
      const insertResult = await db.query(
        `INSERT INTO users (id, email, password_hash, full_name, phone, role, email_verified, is_active, created_at, updated_at)
         VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, email, full_name, phone, role, is_active, email_verified`,
        [
          userId,
          clerkUser.primaryEmailAddress?.emailAddress,
          clerkUser.firstName && clerkUser.lastName 
            ? `${clerkUser.firstName} ${clerkUser.lastName}`
            : clerkUser.username || 'User',
          clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
          'borrower', // Default role
          emailVerifiedTimestamp,
          true
        ]
      );
      user = insertResult.rows[0];
      console.log(`[Clerk Auth] New user created: ${user.email} with role: ${user.role}`);
    }

    // Ensure role exists (data integrity check)
    if (!user.role) {
      console.warn(`[Clerk Auth] User ${user.email} has no role, setting to borrower`);
      await db.query(
        `UPDATE users SET role = 'borrower', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [userId]
      );
      user.role = 'borrower';
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active,
      email_verified: emailVerified,
      clerkUserId: userId,
      clerkSessionId: sessionId
    };

    next();
  } catch (error) {
    console.error('❌ Clerk auth error:', error);
    console.error('Error stack:', error.stack);
    
    // Don't expose internal errors in production
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'Authentication failed' 
      : error.message;
    
    return res.status(500).json({ 
      error: 'Authentication error',
      message: errorMessage
    });
  }
};

// Middleware to check if user is operations/admin
const requireClerkOps = (req, res, next) => {
  if (!req.user || !['operations', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Operations access required' });
  }
  next();
};

// Middleware to check if user is admin
const requireClerkAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = {
  requireClerkAuth,
  requireClerkOps,
  requireClerkAdmin
};

