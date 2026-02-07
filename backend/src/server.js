require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { clerkMiddleware } = require('@clerk/express');

const authRoutes = require('./routes/auth');
const clerkRoutes = require('./routes/clerk');
const loanRoutes = require('./routes/loans');
const documentRoutes = require('./routes/documents');
const paymentRoutes = require('./routes/payments');
const opsRoutes = require('./routes/operations');
const profileRoutes = require('./routes/profile');
const contactRoutes = require('./routes/contact');
const fileRoutes = require('./routes/files');

const { errorHandler } = require('./middleware/errorHandler');
const { pool, query } = require('./db/config');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware with explicit CSP configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for inline scripts
        "'unsafe-eval'", // Required for some frameworks (Vite in dev mode)
        "https://*.clerk.accounts.dev", // Clerk authentication
        "https://*.clerk.com", // Clerk services
        "https://challenges.cloudflare.com", // Cloudflare challenges
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for inline styles
        "https://fonts.googleapis.com", // Google Fonts
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com", // Google Fonts
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:",
      ],
      connectSrc: [
        "'self'",
        "https://*.clerk.accounts.dev", // Clerk API
        "https://*.clerk.com", // Clerk services
        "https://api.stripe.com", // Stripe API
        "https://challenges.cloudflare.com", // Cloudflare challenges
      ],
      frameSrc: [
        "'self'",
        "https://*.clerk.accounts.dev", // Clerk iframes
        "https://js.stripe.com", // Stripe iframes
      ],
    },
  },
}));

// CORS configuration - allows frontend domain from environment or X-Frontend-URL header
const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Frontend-URL'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if we should allow all origins (from .env)
    if (process.env.ALLOW_ALL_ORIGINS === 'true' || process.env.ALLOW_ALL_ORIGINS === '1') {
      return callback(null, true);
    }

    // Build list of allowed origins
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // Allow if in the allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel preview and production domains if FRONTEND_URL contains vercel.app
    if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('vercel.app')) {
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
    }

    // Log blocked origin for debugging (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🚫 CORS blocked origin:', origin);
      console.log('   Allowed origins:', allowedOrigins);
    }

    callback(new Error('Not allowed by CORS'));
  }
};

app.use(cors(corsOptions));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Clerk middleware - MUST be after body parsing and before routes
// Only apply if keys are configured
if (process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
  try {
app.use(clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
}));
    console.log('✅ Clerk middleware initialized');
  } catch (clerkError) {
    console.error('❌ Error initializing Clerk middleware:', clerkError.message);
    // Don't crash the server, but log the error
  }
} else {
  console.warn('⚠️ Clerk keys not configured - Clerk middleware disabled');
  console.warn('   Set CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to enable Clerk authentication');
}

// Static files for uploads (dev only)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    hasClerkSecret: !!process.env.CLERK_SECRET_KEY,
    hasClerkPublishable: !!process.env.CLERK_PUBLISHABLE_KEY,
    hasDatabase: !!process.env.DATABASE_URL,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Clerk configuration check (for debugging)
app.get('/api/debug/clerk-config', (req, res) => {
  res.json({
    hasClerkSecret: !!process.env.CLERK_SECRET_KEY,
    clerkSecretPrefix: process.env.CLERK_SECRET_KEY ? process.env.CLERK_SECRET_KEY.substring(0, 15) + '...' : 'NOT SET',
    clerkSecretLength: process.env.CLERK_SECRET_KEY ? process.env.CLERK_SECRET_KEY.length : 0,
    hasClerkPublishable: !!process.env.CLERK_PUBLISHABLE_KEY,
    clerkPublishablePrefix: process.env.CLERK_PUBLISHABLE_KEY ? process.env.CLERK_PUBLISHABLE_KEY.substring(0, 15) + '...' : 'NOT SET',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/clerk', clerkRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/operations', opsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/files', fileRoutes);

// Error handling
app.use(errorHandler);

// Handle Clerk handshake errors gracefully
app.use((err, req, res, next) => {
  // Check if this is a Clerk-related error
  if (req.path && req.path.includes('__clerk_handshake')) {
    console.error('❌ Clerk handshake error:', err.message);
    return res.status(500).json({ 
      error: 'Clerk authentication error',
      message: 'Failed to initialize Clerk session. Please check Clerk configuration.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  next(err);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    console.log('📊 Testing database connection...');
    
    // Check if using SQLite or PostgreSQL
    const databaseUrl = process.env.DATABASE_URL || '';
    const isSQLite = databaseUrl.startsWith('sqlite:');
    
    if (isSQLite) {
      // SQLite test query
      const result = await query('SELECT datetime("now") as current_time');
      console.log('✅ Database connection successful!');
      console.log('   └─ SQLite Database');
      console.log(`   └─ Database file: ${databaseUrl.replace('sqlite:', '')}`);
      console.log(`   └─ Server time: ${result.rows[0].current_time}`);
    } else {
      // PostgreSQL test query
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      const { current_time, pg_version } = result.rows[0];
      const version = pg_version.split(' ')[0] + ' ' + pg_version.split(' ')[1];
      
      console.log('✅ Database connection successful!');
      console.log(`   └─ PostgreSQL ${version}`);
      console.log(`   └─ Server time: ${current_time}`);
      
      client.release();
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error(`   └─ Error: ${error.message}`);
    if (error.code === 'ECONNREFUSED') {
      console.error('   └─ Make sure PostgreSQL is running and DATABASE_URL is correct');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   └─ Database host not found. Check your DATABASE_URL');
    } else if (error.code === '3D000') {
      console.error('   └─ Database does not exist. Create it first or check DATABASE_URL');
    } else if (error.code === '28P01') {
      console.error('   └─ Authentication failed. Check database credentials in DATABASE_URL');
    }
    return false;
  }
}

// Start server with database connection check
async function startServer() {
  const dbConnected = await testDatabaseConnection();
  
  if (!dbConnected) {
    console.error('\n⚠️  Server starting without database connection. Some features may not work.\n');
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 RPC Lending API running on port ${PORT}`);
    console.log(`   └─ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   └─ Database: ${dbConnected ? '✅ Connected' : '❌ Not connected'}`);
  });
}

// Only start server if not in serverless environment (Vercel)
// Vercel will handle the server, we just export the app
if (process.env.VERCEL !== '1' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
} else {
  // In serverless, just test DB connection without blocking
  testDatabaseConnection().catch((error) => {
    console.error('Database connection test failed:', error.message);
  });
}

module.exports = app;
