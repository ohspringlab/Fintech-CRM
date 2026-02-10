require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth');
const loanRoutes = require('./routes/loans');
const documentRoutes = require('./routes/documents');
const paymentRoutes = require('./routes/payments');
const opsRoutes = require('./routes/operations');
const profileRoutes = require('./routes/profile');
const contactRoutes = require('./routes/contact');
const fileRoutes = require('./routes/files');
const brokerRoutes = require('./routes/brokers');
const capitalRoutes = require('./routes/capital');

const { errorHandler } = require('./middleware/errorHandler');
const { pool, query } = require('./db/config');

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware - configure Helmet to allow cross-origin images and Stripe scripts
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin images
  crossOriginEmbedderPolicy: false, // Disable for images
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'", // Required for Vite dev mode
        "https://js.stripe.com",
        "https://*.stripe.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:"
      ],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://*.stripe.com",
        "https://r.stripe.com" // Stripe analytics endpoint
      ],
      frameSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://hooks.stripe.com"
      ]
    }
  }
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

    // Allow Replit domains if FRONTEND_URL contains replit.dev or replit.app
    if (process.env.FRONTEND_URL && (process.env.FRONTEND_URL.includes('replit.dev') || process.env.FRONTEND_URL.includes('replit.app'))) {
      if (origin.includes('replit.dev') || origin.includes('replit.app')) {
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

// Static files for uploads (dev only) - with CORS headers
// Apply CORS middleware specifically for static files
app.use('/uploads', cors(corsOptions));

// Serve static files with custom headers
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath, stat) => {
    // Ensure CORS headers are set for all static file responses
    const origin = res.req?.headers?.origin;
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.includes(origin) || process.env.ALLOW_ALL_ORIGINS === 'true') {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
    }
    
    // Set cache headers for images
    if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    }
  }
}));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/operations', opsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/brokers', brokerRoutes);
app.use('/api/capital', capitalRoutes);

// Error handling
app.use(errorHandler);

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

// Start server (standard Node.js deployment)
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = app;
