// api/index.js - Main serverless function for Vercel
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('../backend/src/routes/auth');
const clerkRoutes = require('../backend/src/routes/clerk');
const loanRoutes = require('../backend/src/routes/loans');
const documentRoutes = require('../backend/src/routes/documents');
const paymentRoutes = require('../backend/src/routes/payments');
const opsRoutes = require('../backend/src/routes/operations');
const profileRoutes = require('../backend/src/routes/profile');
const contactRoutes = require('../backend/src/routes/contact');

const { errorHandler } = require('../backend/src/middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - dynamically allows all Vercel preview domains
const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Frontend-URL'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, curl, mobile apps, etc.)
    if (!origin) return callback(null, true);

    // Allow all Vercel preview and production domains (*.vercel.app)
    // This dynamically handles any preview URL Vercel generates
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }

    // Allow localhost for development
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }

    // Allow explicit FRONTEND_URL if set
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }

    // Allow all origins if ALLOW_ALL_ORIGINS is set (for testing only)
    if (process.env.ALLOW_ALL_ORIGINS === 'true' || process.env.ALLOW_ALL_ORIGINS === '1') {
      return callback(null, true);
    }

    // Log blocked origin for debugging (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🚫 CORS blocked origin:', origin);
    }

    callback(new Error('Not allowed by CORS'));
  }
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Explicitly handle OPTIONS preflight requests for all routes
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  
  // Echo the exact origin if it's a Vercel domain
  if (origin && origin.endsWith('.vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Frontend-URL');
  res.status(200).end();
});

// Logging (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined'));
}

// Body parsing with increased limits for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Clerk middleware (must be before other routes)
// Note: Clerk Express middleware will be added when CLERK_SECRET_KEY is set
// The middleware is applied per-route using requireClerkAuth

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Export for Vercel serverless
module.exports = app;
