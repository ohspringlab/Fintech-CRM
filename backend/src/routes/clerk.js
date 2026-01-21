// Clerk integration routes
const express = require('express');
const db = require('../db/config');

const router = express.Router();

// Get user info from Clerk (for frontend)
router.get('/user-info', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Get user from database
    const userResult = await db.query(
      `SELECT id, email, full_name, phone, role, is_active, email_verified
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: userResult.rows[0] });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

module.exports = router;

