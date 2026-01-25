require('dotenv').config();
const { pool } = require('./config');

async function deleteUserData() {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.error('❌ Usage: node delete-user-data.js <email>');
      console.error('   Example: node delete-user-data.js user@example.com');
      process.exit(1);
    }

    console.log(`\n🗑️  Deleting all data for user: ${email}\n`);

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email, full_name FROM users WHERE LOWER(TRIM(email)) = $1',
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const userId = userResult.rows[0].id;
    const userName = userResult.rows[0].full_name || email;
    
    console.log(`✅ Found user:`);
    console.log(`   ID: ${userId}`);
    console.log(`   Email: ${userResult.rows[0].email}`);
    console.log(`   Name: ${userName}\n`);

    // Get counts before deletion
    const counts = {
      loans: 0,
      documents: 0,
      payments: 0,
      notifications: 0,
      auditLogs: 0,
      crmProfile: 0,
      needsListItems: 0,
      statusHistory: 0,
      emailQueue: 0,
    };

    try {
      const loanCount = await pool.query('SELECT COUNT(*) FROM loan_requests WHERE user_id = $1', [userId]);
      counts.loans = parseInt(loanCount.rows[0].count);
    } catch (e) {}

    try {
      // Documents table uses uploaded_by, not user_id
      const hasUploadedBy = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'uploaded_by'
      `);
      if (hasUploadedBy.rows.length > 0) {
        const docCount = await pool.query('SELECT COUNT(*) FROM documents WHERE uploaded_by = $1', [userId]);
        counts.documents = parseInt(docCount.rows[0].count);
      } else {
        // Count documents by loan_id instead
        const loansResult = await pool.query('SELECT id FROM loan_requests WHERE user_id = $1', [userId]);
        if (loansResult.rows.length > 0) {
          const loanIds = loansResult.rows.map(r => r.id);
          const loanIdsStr = loanIds.map(id => `'${id}'`).join(',');
          const docCount = await pool.query(
            `SELECT COUNT(*) FROM documents WHERE loan_id::text = ANY(ARRAY[${loanIdsStr}]::text[])`
          );
          counts.documents = parseInt(docCount.rows[0].count);
        }
      }
    } catch (e) {}

    try {
      const hasUserId = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'user_id'
      `);
      if (hasUserId.rows.length > 0) {
        const paymentCount = await pool.query('SELECT COUNT(*) FROM payments WHERE user_id = $1', [userId]);
        counts.payments = parseInt(paymentCount.rows[0].count);
      } else {
        // Count payments by loan_id instead
        const loansResult = await pool.query('SELECT id FROM loan_requests WHERE user_id = $1', [userId]);
        if (loansResult.rows.length > 0) {
          const loanIds = loansResult.rows.map(r => r.id);
          const loanIdsStr = loanIds.map(id => `'${id}'`).join(',');
          const paymentCount = await pool.query(
            `SELECT COUNT(*) FROM payments WHERE loan_id::text = ANY(ARRAY[${loanIdsStr}]::text[])`
          );
          counts.payments = parseInt(paymentCount.rows[0].count);
        }
      }
    } catch (e) {}

    try {
      const notifCount = await pool.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1', [userId]);
      counts.notifications = parseInt(notifCount.rows[0].count);
    } catch (e) {}

    try {
      const auditCount = await pool.query('SELECT COUNT(*) FROM audit_logs WHERE user_id = $1', [userId]);
      counts.auditLogs = parseInt(auditCount.rows[0].count);
    } catch (e) {}

    try {
      const crmCount = await pool.query('SELECT COUNT(*) FROM crm_profiles WHERE user_id = $1', [userId]);
      counts.crmProfile = parseInt(crmCount.rows[0].count);
    } catch (e) {}

    try {
      // Get loans first to count related data
      const loansResult = await pool.query('SELECT id FROM loan_requests WHERE user_id = $1', [userId]);
      const loanIds = loansResult.rows.map(r => r.id);
      
      if (loanIds.length > 0) {
        const loanIdsStr = loanIds.map(id => `'${id}'`).join(',');
        const needsCount = await pool.query(
          `SELECT COUNT(*) FROM needs_list_items WHERE loan_id::text = ANY(ARRAY[${loanIdsStr}]::text[])`
        );
        counts.needsListItems = parseInt(needsCount.rows[0].count);

        const historyCount = await pool.query(
          `SELECT COUNT(*) FROM loan_status_history WHERE loan_id::text = ANY(ARRAY[${loanIdsStr}]::text[])`
        );
        counts.statusHistory = parseInt(historyCount.rows[0].count);
      }
    } catch (e) {}

    try {
      const emailCount = await pool.query('SELECT COUNT(*) FROM email_queue WHERE user_id = $1', [userId]);
      counts.emailQueue = parseInt(emailCount.rows[0].count);
    } catch (e) {}

    console.log('📊 Data to be deleted:');
    console.log(`   Loans: ${counts.loans}`);
    console.log(`   Documents: ${counts.documents}`);
    console.log(`   Payments: ${counts.payments}`);
    console.log(`   Notifications: ${counts.notifications}`);
    console.log(`   Audit Logs: ${counts.auditLogs}`);
    console.log(`   CRM Profile: ${counts.crmProfile}`);
    console.log(`   Needs List Items: ${counts.needsListItems}`);
    console.log(`   Status History: ${counts.statusHistory}`);
    console.log(`   Email Queue: ${counts.emailQueue}\n`);

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Delete in order to respect foreign key constraints
      // 1. Delete audit logs (references user_id, no cascade)
      if (counts.auditLogs > 0) {
        await pool.query('DELETE FROM audit_logs WHERE user_id = $1', [userId]);
        console.log(`✅ Deleted ${counts.auditLogs} audit log entries`);
      }

      // 2. Delete email queue entries
      if (counts.emailQueue > 0) {
        await pool.query('DELETE FROM email_queue WHERE user_id = $1', [userId]);
        console.log(`✅ Deleted ${counts.emailQueue} email queue entries`);
      }

      // 3. Get loan IDs before deleting loans (for related data)
      const loansResult = await pool.query('SELECT id FROM loan_requests WHERE user_id = $1', [userId]);
      const loanIds = loansResult.rows.map(r => r.id);

      if (loanIds.length > 0) {
        // Delete needs list items (references loan_id, will cascade but also has requested_by/reviewed_by)
        // Use string array and cast appropriately
        const loanIdsStr = loanIds.map(id => `'${id}'`).join(',');
        await pool.query(
          `DELETE FROM needs_list_items WHERE loan_id::text = ANY(ARRAY[${loanIdsStr}]::text[]) OR requested_by::text = $1 OR reviewed_by::text = $1`,
          [userId]
        );
        console.log(`✅ Deleted needs list items`);

        // Delete loan status history (references loan_id, will cascade but also has changed_by)
        await pool.query(
          `DELETE FROM loan_status_history WHERE loan_id::text = ANY(ARRAY[${loanIdsStr}]::text[]) OR changed_by::text = $1`,
          [userId]
        );
        console.log(`✅ Deleted status history entries`);

        // Delete documents (references loan_id, will cascade)
        // Documents table uses uploaded_by, not user_id
        try {
          const hasUploadedBy = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'documents' AND column_name = 'uploaded_by'
          `);
          if (hasUploadedBy.rows.length > 0) {
            await pool.query(
              `DELETE FROM documents WHERE loan_id::text = ANY(ARRAY[${loanIdsStr}]::text[]) OR uploaded_by::text = $1`,
              [userId]
            );
          } else {
            await pool.query(
              `DELETE FROM documents WHERE loan_id::text = ANY(ARRAY[${loanIdsStr}]::text[])`
            );
          }
          console.log(`✅ Deleted documents`);
        } catch (e) {
          console.log(`⚠️  Could not delete documents: ${e.message}`);
        }

        // Delete payments (references loan_id, will cascade)
        // Check if user_id column exists
        try {
          const hasUserId = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'user_id'
          `);
          if (hasUserId.rows.length > 0) {
            await pool.query(
              `DELETE FROM payments WHERE loan_id::text = ANY(ARRAY[${loanIdsStr}]::text[]) OR user_id::text = $1`,
              [userId]
            );
          } else {
            await pool.query(
              `DELETE FROM payments WHERE loan_id::text = ANY(ARRAY[${loanIdsStr}]::text[])`
            );
          }
          console.log(`✅ Deleted payments`);
        } catch (e) {
          console.log(`⚠️  Could not delete payments: ${e.message}`);
        }

        // Delete closing checklist items if table exists
        try {
          await pool.query(
            `DELETE FROM closing_checklist_items WHERE loan_id::text = ANY(ARRAY[${loanIdsStr}]::text[]) OR created_by::text = $1 OR completed_by::text = $1`,
            [userId]
          );
          console.log(`✅ Deleted closing checklist items`);
        } catch (e) {
          // Table might not exist, ignore
        }

        // Delete loans (will cascade to related tables)
        await pool.query('DELETE FROM loan_requests WHERE user_id = $1', [userId]);
        console.log(`✅ Deleted ${counts.loans} loan requests`);
      }

      // 4. Delete notifications (has ON DELETE CASCADE, but delete explicitly)
      if (counts.notifications > 0) {
        await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
        console.log(`✅ Deleted ${counts.notifications} notifications`);
      }

      // 5. Delete CRM profile (has ON DELETE CASCADE, but delete explicitly)
      if (counts.crmProfile > 0) {
        await pool.query('DELETE FROM crm_profiles WHERE user_id = $1', [userId]);
        console.log(`✅ Deleted CRM profile`);
      }

      // 6. Update any loans where this user is assigned as processor
      await pool.query('UPDATE loan_requests SET assigned_processor_id = NULL WHERE assigned_processor_id = $1', [userId]);
      const processorUpdate = await pool.query('SELECT COUNT(*) FROM loan_requests WHERE assigned_processor_id = $1', [userId]);
      if (parseInt(processorUpdate.rows[0].count) === 0) {
        console.log(`✅ Removed processor assignments`);
      }

      // 7. Finally, delete the user (this will cascade to any remaining references)
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      console.log(`✅ Deleted user: ${userName}`);

      // Commit transaction
      await pool.query('COMMIT');
      
      console.log('\n✅ Successfully deleted all data for user:', email);
      console.log('   Transaction committed.\n');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to delete user data:', error.message);
    console.error(error);
    process.exit(1);
  }
}

deleteUserData();

