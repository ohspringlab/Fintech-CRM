const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/config');
const { authenticate, requireOps } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { notifyOpsDocumentUpload } = require('../services/emailService');

const router = express.Router();

// Configure multer for file uploads - use disk storage
const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
      }
    });

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, images, Word, Excel, CSV, TXT'));
    }
  }
});

// Get documents for a loan with folder organization
router.get('/loan/:loanId', authenticate, async (req, res, next) => {
  try {
    // Verify access (borrower owns loan or is ops)
    const loanCheck = await db.query(
      'SELECT id, user_id FROM loan_requests WHERE id = $1',
      [req.params.loanId]
    );

    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const isOwner = loanCheck.rows[0].user_id === req.user.id;
    const isOps = ['operations', 'admin'].includes(req.user.role);

    if (!isOwner && !isOps) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get documents grouped by folder
    // Check if needs_list_item_id exists in documents table
    let result;
    try {
      const columnCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'needs_list_item_id'
      `);
      const hasNeedsListItemId = columnCheck.rows.length > 0;
      
      if (hasNeedsListItemId) {
        result = await db.query(`
      SELECT d.*, 
                 nli.name as needs_list_type, 
                 'pending' as needs_list_status,
                 nli.category as folder_name
      FROM documents d
      LEFT JOIN needs_list_items nli ON d.needs_list_item_id = nli.id
      WHERE d.loan_id = $1
          ORDER BY nli.category, d.uploaded_at DESC
        `, [req.params.loanId]);
      } else {
        result = await db.query(`
          SELECT d.*, 
                 d.name as needs_list_type, 
                 'pending' as needs_list_status,
                 d.category as folder_name
          FROM documents d
          WHERE d.loan_id = $1
          ORDER BY d.category, d.uploaded_at DESC
        `, [req.params.loanId]);
      }
    } catch (error) {
      // Fallback: simple query without joins
      result = await db.query(`
        SELECT d.*, 
               d.name as needs_list_type, 
               'pending' as needs_list_status,
               d.category as folder_name
        FROM documents d
        WHERE d.loan_id = $1
        ORDER BY d.category, d.uploaded_at DESC
    `, [req.params.loanId]);
    }

    // Group by folder with color status
    const folders = {};
    const now = new Date();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

    result.rows.forEach(doc => {
      const folderName = doc.folder_name || 'uncategorized';
      if (!folders[folderName]) {
        folders[folderName] = {
          name: folderName,
          documents: [],
          color: 'tan',
          hasNewUploads: false
        };
      }
      folders[folderName].documents.push(doc);
      
      // Update folder color
      if (folders[folderName].documents.length > 0) {
        folders[folderName].color = 'blue';
        if (new Date(doc.uploaded_at) > twentyFourHoursAgo) {
          folders[folderName].color = 'red';
          folders[folderName].hasNewUploads = true;
        }
      }
    });

    res.json({ 
      documents: result.rows,
      folders: Object.values(folders)
    });
  } catch (error) {
    next(error);
  }
});

// Upload document to specific folder
router.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { loanId, needsListItemId, folderName } = req.body;
    
    // File already saved by multer to uploads directory
    const fileName = req.file.filename;
    const filePath = req.file.path;

    // Verify loan ownership or ops access
    const loanCheck = await db.query(
      'SELECT id, user_id, loan_number FROM loan_requests WHERE id = $1',
      [loanId]
    );

    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const isOwner = loanCheck.rows[0].user_id === req.user.id;
    const isOps = ['operations', 'admin'].includes(req.user.role);

    if (!isOwner && !isOps) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Determine folder name and category
    let finalFolderName = folderName || 'uncategorized';
    let category = 'general';
    
    if (needsListItemId) {
      const needsItem = await db.query(`
        SELECT 
          category as folder_name,
          category as needs_list_category
        FROM needs_list_items WHERE id = $1
      `, [needsListItemId]);
      if (needsItem.rows.length > 0) {
        finalFolderName = needsItem.rows[0].folder_name || finalFolderName;
        // Use the needs list item's category directly for matching
        category = needsItem.rows[0].needs_list_category || category;
      }
    }

    // Check which optional columns exist in documents table
    let hasNameColumn = false;
    let hasCategoryColumn = false;
    try {
      const columnCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'documents' 
        AND column_name IN ('name', 'category')
      `);
      const columnNames = columnCheck.rows.map(row => row.column_name);
      hasNameColumn = columnNames.includes('name');
      hasCategoryColumn = columnNames.includes('category');
    } catch (error) {
      console.error('Error checking for optional columns:', error);
      // Default to true if check fails (based on error message)
      hasCategoryColumn = true;
    }

    // If category wasn't set from needs list item, determine it based on folder name
    if (category === 'general' && !needsListItemId) {
    if (finalFolderName.includes('income') || finalFolderName.includes('tax') || finalFolderName.includes('bank')) {
      category = 'financial';
    } else if (finalFolderName.includes('property') || finalFolderName.includes('lease') || finalFolderName.includes('rent')) {
      category = 'property';
    } else if (finalFolderName.includes('identification') || finalFolderName.includes('entity')) {
      category = 'identity';
    } else if (finalFolderName.includes('construction') || finalFolderName.includes('contract')) {
      category = 'construction';
      }
    }

    // Build INSERT statement dynamically based on schema
    // Note: documents table has: id, loan_id, name, category, status, uploaded_by, uploaded_at, file_url, notes
    // Check if needs_list_item_id column exists
    let hasNeedsListItemIdColumn = false;
    try {
      const needsListItemIdCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'needs_list_item_id'
      `);
      hasNeedsListItemIdColumn = needsListItemIdCheck.rows.length > 0;
    } catch (error) {
      console.error('Error checking for needs_list_item_id column:', error);
    }
    
    let columns = ['loan_id', 'uploaded_by', 'name', 'category', 'file_url', 'status'];
    let values = [
      loanId,
      req.user.id,
      req.file.originalname, // Use original filename as name
      category,
      `/uploads/${fileName}`, // Store file path in file_url
      'pending' // Default status
    ];
    let placeholders = ['$1', '$2', '$3', '$4', '$5', '$6'];
    let paramIndex = 6;
    
    // Add needs_list_item_id only if column exists
    if (hasNeedsListItemIdColumn && needsListItemId) {
      columns.push('needs_list_item_id');
      values.push(needsListItemId);
      placeholders.push(`$${++paramIndex}`);
    }

    // Save document record
    const result = await db.query(`
      INSERT INTO documents (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `, values);

    // Update needs list item (status column doesn't exist, so just update updated_at if column exists)
    if (needsListItemId) {
      try {
        // Check if updated_at column exists
        const updatedAtCheck = await db.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'needs_list_items' AND column_name = 'updated_at'
        `);
        if (updatedAtCheck.rows.length > 0) {
      await db.query(`
            UPDATE needs_list_items SET updated_at = NOW()
        WHERE id = $1
      `, [needsListItemId]);
        }
      } catch (error) {
        // Ignore if update fails - not critical
        console.error('Error updating needs list item:', error);
      }
    }

    await logAudit(req.user.id, 'DOCUMENT_UPLOADED', 'document', result.rows[0].id, req, {
      fileName: req.file.originalname,
      folderName: finalFolderName,
      loanId
    });

    // Notify operations team
    const loan = loanCheck.rows[0];
    await notifyOpsDocumentUpload(loan, { ...result.rows[0], folder_name: finalFolderName }, req.user.full_name);

    // Create notification for ops
    await db.query(`
      INSERT INTO notifications (id, user_id, loan_id, type, title, message)
      SELECT gen_random_uuid(), id, $1, 'document_upload', $2, $3
      FROM users WHERE role IN ('operations', 'admin')
    `, [loanId, 'New Document Uploaded', `${req.user.full_name} uploaded "${req.file.originalname}" to ${finalFolderName} folder for loan ${loan.loan_number}`]);

    res.status(201).json({ document: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete document
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    // Check ownership or ops access
    const docCheck = await db.query(`
      SELECT d.*, lr.user_id as loan_owner_id FROM documents d
      JOIN loan_requests lr ON d.loan_id = lr.id
      WHERE d.id = $1
    `, [req.params.id]);

    if (docCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const isOwner = docCheck.rows[0].loan_owner_id === req.user.id;
    const isOps = ['operations', 'admin'].includes(req.user.role);

    if (!isOwner && !isOps) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await db.query('DELETE FROM documents WHERE id = $1', [req.params.id]);

    await logAudit(req.user.id, 'DOCUMENT_DELETED', 'document', req.params.id, req);

    res.json({ message: 'Document deleted' });
  } catch (error) {
    next(error);
  }
});

// Get needs list for a loan with folder colors
router.get('/needs-list/:loanId', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

    // Verify loan exists and user has access
    const loanCheck = await db.query(
      'SELECT id, user_id FROM loan_requests WHERE id = $1',
      [req.params.loanId]
    );

    if (loanCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    const isOwner = loanCheck.rows[0].user_id === req.user.id;
    const isOps = ['operations', 'admin'].includes(req.user.role);

    if (!isOwner && !isOps) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get needs list items for this loan
    // Use document_type/folder_name if available, otherwise fall back to name/category
    // Use a simpler query that handles NULL values and missing columns gracefully
    let result;
    try {
      // Check if needs_list_item_id column exists in documents table
      const columnCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'needs_list_item_id'
      `);
      const hasNeedsListItemId = columnCheck.rows.length > 0;
      
      // Use name and category columns directly (document_type and folder_name don't exist)
      if (hasNeedsListItemId) {
        // Use foreign key relationship if column exists
      result = await db.query(`
        SELECT 
          nli.id,
          nli.loan_id,
            nli.name as document_type,
            nli.category as folder_name,
            nli.name,
            nli.category,
          nli.description,
          COALESCE(nli.is_required, true) as is_required,
            'pending' as status,
          (SELECT COUNT(*) FROM documents d WHERE d.needs_list_item_id = nli.id) as document_count,
          (SELECT MAX(uploaded_at) FROM documents d WHERE d.needs_list_item_id = nli.id) as last_upload
        FROM needs_list_items nli
        WHERE nli.loan_id = $1
        ORDER BY nli.id DESC
      `, [req.params.loanId]);
      } else {
        // Match by category if needs_list_item_id doesn't exist
        result = await db.query(`
          SELECT 
            nli.id,
            nli.loan_id,
            nli.name as document_type,
            nli.category as folder_name,
            nli.name,
            nli.category,
            nli.description,
            COALESCE(nli.is_required, true) as is_required,
            'pending' as status,
            (
              SELECT COUNT(*) 
              FROM documents d 
              WHERE d.loan_id = nli.loan_id
                AND nli.category IS NOT NULL 
                AND nli.category != ''
                AND d.category = nli.category
            ) as document_count,
            (
              SELECT MAX(uploaded_at) 
              FROM documents d 
              WHERE d.loan_id = nli.loan_id
                AND nli.category IS NOT NULL 
                AND nli.category != ''
                AND d.category = nli.category
            ) as last_upload
          FROM needs_list_items nli
          WHERE nli.loan_id = $1
          ORDER BY nli.id DESC
        `, [req.params.loanId]);
      }
      
      // Filter out items without name or category in JavaScript
      result.rows = result.rows.filter(item => 
        (item.document_type && item.document_type.trim() !== '') || (item.name && item.name.trim() !== '')
      ).filter(item =>
        (item.folder_name && item.folder_name.trim() !== '') || (item.category && item.category.trim() !== '')
      );
    } catch (queryError) {
      console.error('Error fetching needs list:', queryError);
      console.error('Query error details:', queryError.message, queryError.stack);
      // Return empty list if query fails
      result = { rows: [] };
    }

    // Add folder color to each item and map is_required to required for frontend compatibility
    const needsListWithColors = result.rows.map(item => {
      let folderColor = 'tan'; // No documents - tan/beige
      if (item.document_count > 0) {
        folderColor = 'blue'; // Has documents - blue
        if (item.last_upload && new Date(item.last_upload) > twentyFourHoursAgo) {
          folderColor = 'red'; // New upload in last 24 hours - red
        }
      }
      // Map is_required to required for frontend compatibility
      const isRequired = item.is_required !== undefined ? item.is_required : (item.required !== undefined ? item.required : true);
      const { is_required, required, ...rest } = item;
      return { ...rest, required: isRequired, folder_color: folderColor };
    });

    res.json({ needsList: needsListWithColors });
  } catch (error) {
    console.error('Error fetching needs list:', error);
    next(error);
  }
});

// Get folder summary for a loan
router.get('/folders/:loanId', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

    // Check if needs_list_item_id exists in documents table
    let result;
    try {
      const columnCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'needs_list_item_id'
      `);
      const hasNeedsListItemId = columnCheck.rows.length > 0;
      
      if (hasNeedsListItemId) {
        result = await db.query(`
      SELECT 
            nli.category as folder_name,
        COUNT(DISTINCT nli.id) as items_count,
        COUNT(DISTINCT d.id) as documents_count,
        MAX(d.uploaded_at) as last_upload,
            0 as pending_count,
            0 as uploaded_count,
            0 as reviewed_count
      FROM needs_list_items nli
      LEFT JOIN documents d ON d.needs_list_item_id = nli.id
      WHERE nli.loan_id = $1
          GROUP BY nli.category
          ORDER BY nli.category
        `, [req.params.loanId]);
      } else {
        result = await db.query(`
          SELECT 
            nli.category as folder_name,
            COUNT(DISTINCT nli.id) as items_count,
            COUNT(DISTINCT d.id) as documents_count,
            MAX(d.uploaded_at) as last_upload,
            0 as pending_count,
            0 as uploaded_count,
            0 as reviewed_count
          FROM needs_list_items nli
          LEFT JOIN documents d ON d.loan_id = nli.loan_id AND d.category = nli.category
          WHERE nli.loan_id = $1
          GROUP BY nli.category
          ORDER BY nli.category
        `, [req.params.loanId]);
      }
    } catch (error) {
      // Fallback: simple query
      result = await db.query(`
        SELECT 
          nli.category as folder_name,
          COUNT(DISTINCT nli.id) as items_count,
          0 as documents_count,
          NULL as last_upload,
          0 as pending_count,
          0 as uploaded_count,
          0 as reviewed_count
        FROM needs_list_items nli
        WHERE nli.loan_id = $1
        GROUP BY nli.category
        ORDER BY nli.category
    `, [req.params.loanId]);
    }

    const folders = result.rows.map(folder => {
      let color = 'tan';
      if (folder.documents_count > 0) {
        color = 'blue';
        if (folder.last_upload && new Date(folder.last_upload) > twentyFourHoursAgo) {
          color = 'red';
        }
      }
      return { ...folder, color };
    });

    res.json({ folders });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
