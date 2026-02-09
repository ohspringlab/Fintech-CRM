const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// CORS configuration for file routes
const fileCorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if we should allow all origins
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
      console.log('🚫 File route CORS blocked origin:', origin);
      console.log('   Allowed origins:', allowedOrigins);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  exposedHeaders: ['Content-Type', 'Content-Length']
};

// Apply CORS to all file routes
router.use(cors(fileCorsOptions));

// Serve profile images (public access, no auth required for viewing)
// CORS is handled by global middleware in server.js
router.get('/profile-images/:filename', (req, res, next) => {
  try {
    const filename = req.params.filename;
    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(__dirname, '../../uploads/profile-images', sanitizedFilename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Determine content type based on file extension
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    const contentType = contentTypes[ext] || 'image/jpeg';

    // Set content headers (CORS is handled by global middleware)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
    
    // Send file using res.sendFile which handles headers better
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending profile image:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error reading file' });
        }
      }
    });
  } catch (error) {
    console.error('Error serving profile image:', error);
    next(error);
  }
});

// Serve files from /tmp (legacy compatibility - files now stored in /uploads)
router.get('/tmp/:filename', authenticate, (req, res, next) => {
  try {
    const filename = req.params.filename;
    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join('/tmp', sanitizedFilename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Determine content type based on file extension
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv',
      '.txt': 'text/plain'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Set headers and send file
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error reading file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });
  } catch (error) {
    console.error('Error serving file:', error);
    next(error);
  }
});

module.exports = router;


