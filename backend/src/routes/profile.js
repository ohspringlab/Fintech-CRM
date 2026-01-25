const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db/config');
const { requireClerkAuth } = require('../middleware/clerkAuth');
const { logAudit } = require('../middleware/audit');

const router = express.Router();

// Get current user profile
router.get('/', requireClerkAuth, async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.email, u.full_name, u.phone, u.role, u.created_at,
             cp.date_of_birth, cp.address_line1, cp.address_line2, cp.city, cp.state, cp.zip_code,
             cp.employment_status, cp.annual_income, cp.kyc_verified
      FROM users u
      LEFT JOIN crm_profiles cp ON u.id = cp.user_id
      WHERE u.id = $1
    `, [req.user.id]);

    res.json({ profile: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Update profile
router.put('/', requireClerkAuth, [
  body('fullName').optional().trim().isLength({ min: 2 }),
  body('phone').optional().trim().isLength({ min: 10 })
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, phone } = req.body;

    if (fullName || phone) {
      await db.query(`
        UPDATE users SET 
          full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone),
          updated_at = NOW()
        WHERE id = $3
      `, [fullName, phone, req.user.id]);
    }

    const {
      dateOfBirth, addressLine1, addressLine2, city, state, zipCode,
      employmentStatus, annualIncome
    } = req.body;

    // Check if profile exists
    const profileCheck = await db.query(
      'SELECT id FROM crm_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileCheck.rows.length === 0) {
      // Check the id type and default for crm_profiles table
      const idInfoResult = await db.query(`
        SELECT data_type, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'crm_profiles' AND column_name = 'id'
      `);
      const idInfo = idInfoResult.rows[0];
      const hasDefault = !!idInfo?.column_default;
      const isUuid = idInfo?.data_type === 'uuid';
      
      // If there's no default, we need to generate an ID
      if (!hasDefault) {
        let profileId;
        if (isUuid) {
          // For UUID, use gen_random_uuid()
          const idResult = await db.query('SELECT gen_random_uuid() as id');
          profileId = idResult.rows[0].id;
        } else {
          // For VARCHAR, generate a unique string ID
          profileId = `crm_${req.user.id}_${Date.now()}`;
        }
        
        // Create profile with explicit ID
        await db.query(`
          INSERT INTO crm_profiles (
            id, user_id, date_of_birth, address_line1, address_line2, city, state, zip_code,
            employment_status, annual_income, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        `, [profileId, req.user.id, dateOfBirth || null, addressLine1 || null, addressLine2 || null, city || null, state || null, zipCode || null, employmentStatus || null, annualIncome || null]);
      } else {
        // Create profile without ID (database will use default)
        await db.query(`
          INSERT INTO crm_profiles (
            user_id, date_of_birth, address_line1, address_line2, city, state, zip_code,
            employment_status, annual_income, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        `, [req.user.id, dateOfBirth || null, addressLine1 || null, addressLine2 || null, city || null, state || null, zipCode || null, employmentStatus || null, annualIncome || null]);
      }
    } else {
      // Update existing profile
      await db.query(`
        UPDATE crm_profiles SET
          date_of_birth = COALESCE($1, date_of_birth),
          address_line1 = COALESCE($2, address_line1),
          address_line2 = COALESCE($3, address_line2),
          city = COALESCE($4, city),
          state = COALESCE($5, state),
          zip_code = COALESCE($6, zip_code),
          employment_status = COALESCE($7, employment_status),
          annual_income = COALESCE($8, annual_income),
          updated_at = NOW()
        WHERE user_id = $9
      `, [dateOfBirth, addressLine1, addressLine2, city, state, zipCode, employmentStatus, annualIncome, req.user.id]);
    }

    await logAudit(req.user.id, 'PROFILE_UPDATED', 'user', req.user.id, req);

    res.json({ message: 'Profile updated' });
  } catch (error) {
    next(error);
  }
});

// Get notifications
router.get('/notifications', requireClerkAuth, async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT * FROM notifications 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 50
    `, [req.user.id]);

    const unreadCount = await db.query(`
      SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false
    `, [req.user.id]);

    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadCount.rows[0].count)
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/notifications/:id/read', requireClerkAuth, async (req, res, next) => {
  try {
    await db.query(`
      UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.put('/notifications/read-all', requireClerkAuth, async (req, res, next) => {
  try {
    await db.query(`
      UPDATE notifications SET read = true WHERE user_id = $1
    `, [req.user.id]);

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
