const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/config');
const { requireClerkAuth, requireClerkOps } = require('../middleware/clerkAuth');
const { logAudit } = require('../middleware/audit');
const { notifyOpsDocumentUpload } = require('../services/emailService');

const router = express.Router();

// Check if we're on Vercel/serverless
const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Configure multer for file uploads
// On Vercel, use memory storage; otherwise use disk storage
const storage = isVercel
  ? multer.memoryStorage()
  : multer.diskStorage({
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
router.get('/loan/:loanId', requireClerkAuth, async (req, res, next) => {
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
    const result = await db.query(`
      SELECT d.*, 
             nli.document_type as needs_list_type, 
             nli.status as needs_list_status,
             nli.folder_name
      FROM documents d
      LEFT JOIN needs_list_items nli ON d.needs_list_item_id = nli.id
      WHERE d.loan_id = $1
      ORDER BY nli.folder_name, d.uploaded_at DESC
    `, [req.params.loanId]);

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
router.post('/upload', requireClerkAuth, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { loanId, needsListItemId, folderName } = req.body;
    
    // Handle file storage based on environment
    let fileName;
    let filePath;
    
    if (isVercel) {
      // On Vercel, write to /tmp directory
      fileName = `${uuidv4()}${path.extname(req.file.originalname)}`;
      filePath = path.join('/tmp', fileName);
      fs.writeFileSync(filePath, req.file.buffer);
      // Update req.file to have filename property for consistency
      req.file.filename = fileName;
      req.file.path = filePath;
    } else {
      // Local development - file already saved by multer
      fileName = req.file.filename;
      filePath = req.file.path;
    }

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

    // Determine folder name
    let finalFolderName = folderName || 'uncategorized';
    if (needsListItemId) {
      const needsItem = await db.query('SELECT folder_name FROM needs_list_items WHERE id = $1', [needsListItemId]);
      if (needsItem.rows.length > 0) {
        finalFolderName = needsItem.rows[0].folder_name;
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

    // Determine category based on folder name (similar to needs_list_items logic)
    let category = 'general';
    if (finalFolderName.includes('income') || finalFolderName.includes('tax') || finalFolderName.includes('bank')) {
      category = 'financial';
    } else if (finalFolderName.includes('property') || finalFolderName.includes('lease') || finalFolderName.includes('rent')) {
      category = 'property';
    } else if (finalFolderName.includes('identification') || finalFolderName.includes('entity')) {
      category = 'identity';
    } else if (finalFolderName.includes('construction') || finalFolderName.includes('contract')) {
      category = 'construction';
    }

    // Build INSERT statement dynamically based on schema
    // Note: documents table has: id, loan_id, name, category, status, uploaded_by, uploaded_at, file_url, notes, needs_list_item_id
    let columns = ['loan_id', 'needs_list_item_id', 'uploaded_by', 'name', 'category', 'file_url', 'status'];
    let values = [
      loanId,
      needsListItemId || null,
      req.user.id,
      req.file.originalname, // Use original filename as name
      category,
      isVercel ? `/api/files/tmp/${fileName}` : `/uploads/${fileName}`, // Store file path in file_url
      'pending' // Default status
    ];
    let placeholders = ['$1', '$2', '$3', '$4', '$5', '$6', '$7'];
    let paramIndex = 7;

    // Save document record
    const result = await db.query(`
      INSERT INTO documents (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `, values);

    // Update needs list item status
    if (needsListItemId) {
      await db.query(`
        UPDATE needs_list_items SET status = 'uploaded', updated_at = NOW()
        WHERE id = $1
      `, [needsListItemId]);
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
router.delete('/:id', requireClerkAuth, async (req, res, next) => {
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
router.get('/needs-list/:loanId', requireClerkAuth, async (req, res, next) => {
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
    // Deduplicate by getting the most recent one per document_type and folder_name
    let result;
    try {
      result = await db.query(`
        SELECT DISTINCT ON (
          COALESCE(NULLIF(nli.document_type, ''), nli.name, ''),
          COALESCE(NULLIF(nli.folder_name, ''), nli.category, '')
        ) 
        nli.*,
        COALESCE(nli.is_required, true) as is_required,
        COALESCE(NULLIF(nli.document_type, ''), nli.name, '') as document_type,
        COALESCE(NULLIF(nli.folder_name, ''), nli.category, '') as folder_name,
        (SELECT COUNT(*) FROM documents d WHERE d.needs_list_item_id = nli.id) as document_count,
        (SELECT MAX(uploaded_at) FROM documents d WHERE d.needs_list_item_id = nli.id) as last_upload
        FROM needs_list_items nli
        WHERE nli.loan_id = $1
          AND (nli.document_type IS NOT NULL OR nli.name IS NOT NULL)
          AND (nli.folder_name IS NOT NULL OR nli.category IS NOT NULL)
        ORDER BY 
          COALESCE(NULLIF(nli.document_type, ''), nli.name, ''),
          COALESCE(NULLIF(nli.folder_name, ''), nli.category, ''),
          COALESCE(nli.created_at, CURRENT_TIMESTAMP) DESC,
          COALESCE(nli.is_required, true) DESC
      `, [req.params.loanId]);
    } catch (queryError) {
      // If DISTINCT ON fails, try simpler query without deduplication
      console.error('DISTINCT ON query failed, trying simpler query:', queryError.message);
      result = await db.query(`
        SELECT nli.*,
               COALESCE(nli.is_required, true) as is_required,
               COALESCE(NULLIF(nli.document_type, ''), nli.name, '') as document_type,
               COALESCE(NULLIF(nli.folder_name, ''), nli.category, '') as folder_name,
               (SELECT COUNT(*) FROM documents d WHERE d.needs_list_item_id = nli.id) as document_count,
               (SELECT MAX(uploaded_at) FROM documents d WHERE d.needs_list_item_id = nli.id) as last_upload
        FROM needs_list_items nli
        WHERE nli.loan_id = $1
          AND (nli.document_type IS NOT NULL OR nli.name IS NOT NULL)
          AND (nli.folder_name IS NOT NULL OR nli.category IS NOT NULL)
        ORDER BY COALESCE(nli.created_at, CURRENT_TIMESTAMP) DESC
      `, [req.params.loanId]);
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
router.get('/folders/:loanId', requireClerkAuth, async (req, res, next) => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);

    const result = await db.query(`
      SELECT 
        nli.folder_name,
        COUNT(DISTINCT nli.id) as items_count,
        COUNT(DISTINCT d.id) as documents_count,
        MAX(d.uploaded_at) as last_upload,
        SUM(CASE WHEN nli.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN nli.status = 'uploaded' THEN 1 ELSE 0 END) as uploaded_count,
        SUM(CASE WHEN nli.status = 'reviewed' THEN 1 ELSE 0 END) as reviewed_count
      FROM needs_list_items nli
      LEFT JOIN documents d ON d.needs_list_item_id = nli.id
      WHERE nli.loan_id = $1
      GROUP BY nli.folder_name
      ORDER BY nli.folder_name
    `, [req.params.loanId]);

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
