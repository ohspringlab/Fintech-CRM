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

// CORS configuration
const corsOptions = {
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Frontend-URL'],
  exposedHeaders: ['Content-Type', 'Authorization']
};

// Check if we should allow all origins (from .env)
if (process.env.ALLOW_ALL_ORIGINS === 'true' || process.env.ALLOW_ALL_ORIGINS === '1') {
  // Allow all origins
  corsOptions.origin = true;
} else {
  // Build allowed origins list
  const allowedOrigins = [
    'http://localhost:8080',
    'http://localhost:5173',
    process.env.FRONTEND_URL,
    'https://fintech-crm.vercel.app' // Production URL
  ].filter(Boolean);
  
  corsOptions.origin = (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check exact match first
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow Vercel preview deployments (pattern: *.vercel.app or *-*.vercel.app)
    // Examples:
    // - https://fintech-6yn5eco1u-ohsprings-projects-7dd597a2.vercel.app
    // - https://fintech-crm-git-main-ohsprings-projects-7dd597a2.vercel.app
    const vercelPreviewPattern = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
    if (vercelPreviewPattern.test(origin)) {
      return callback(null, true);
    }
    
    // Allow any subdomain of vercel.app for preview deployments
    if (origin.includes('.vercel.app')) {
      return callback(null, true);
    }
    
    // Log blocked origin for debugging (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🚫 CORS blocked origin:', origin);
    }
    
    callback(new Error('Not allowed by CORS'));
  };
}

app.use(cors(corsOptions));

// Handle OPTIONS preflight requests explicitly
app.options('*', cors(corsOptions));

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
