const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/config');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Submit contact form
router.post('/', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().trim().isLength({ min: 10, max: 20 }),
  body('subject').trim().isLength({ min: 3, max: 200 }).withMessage('Subject must be between 3 and 200 characters'),
  body('message').trim().isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters'),
  body('loanType').optional().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, subject, message, loanType } = req.body;

    // Check if contact_messages table exists, if not create it
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS contact_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          subject VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          loan_type VARCHAR(50),
          status VARCHAR(20) DEFAULT 'new',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (tableError) {
      // Table might already exist, continue
      console.log('Contact messages table check:', tableError.message);
    }

    // Insert contact message
    const contactId = uuidv4();
    await db.query(`
      INSERT INTO contact_messages (id, name, email, phone, subject, message, loan_type, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'new')
    `, [contactId, name, email, phone || null, subject, message, loanType || null]);

    // Queue email notification to admin (if email service is configured)
    try {
      const emailQueueId = uuidv4();
      await db.query(`
        INSERT INTO email_queue (id, email_type, recipient_email, subject, template_data, status)
        VALUES ($1, 'contact_form', $2, $3, $4, 'pending')
      `, [
        emailQueueId,
        process.env.ADMIN_EMAIL || 'admin@rpc-lending.com',
        `New Contact Form Submission: ${subject}`,
        JSON.stringify({
          name,
          email,
          phone: phone || 'Not provided',
          subject,
          message,
          loanType: loanType || 'Not specified',
          contactId
        })
      ]);
    } catch (emailError) {
      // Email queue might not exist or email might fail, but don't fail the request
      console.log('Could not queue email notification:', emailError.message);
    }

    res.json({ 
      message: 'Thank you for contacting us. We will get back to you soon.',
      contactId 
    });
  } catch (error) {
    next(error);
  }
});

// Get contact messages (admin only - would need authentication)
// This is optional and can be added later if needed

module.exports = router;

