const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  console.error('Error stack:', err.stack);
  console.error('Request path:', req.path);
  console.error('Request body:', req.body);

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    });
  }

  // Database errors
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Resource already exists'
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Referenced resource not found'
    });
  }

  // PostgreSQL connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    console.error('Database connection error - check DATABASE_URL and ensure database is running');
    return res.status(500).json({
      error: process.env.NODE_ENV === 'production' 
        ? 'Database connection error' 
        : `Database connection failed: ${err.message}`
    });
  }

  // Table doesn't exist error
  if (err.code === '42P01') {
    console.error('Table does not exist - run migrations: npm run db:migrate');
    return res.status(500).json({
      error: process.env.NODE_ENV === 'production' 
        ? 'Database configuration error' 
        : `Table not found: ${err.message}. Run migrations: npm run db:migrate`
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
