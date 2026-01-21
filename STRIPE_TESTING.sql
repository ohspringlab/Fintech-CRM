-- ============================================
-- STRIPE PAYMENT TESTING - LOAN RESET SCRIPT
-- ============================================
-- Use this to reset a loan to test Stripe payments
--
-- INSTRUCTIONS:
-- 1. Find your loan ID from the loans table
-- 2. Replace 'YOUR_LOAN_ID' with your actual loan ID
-- 3. Run these queries in pgAdmin

-- Step 1: Find your recent loans
SELECT 
    id,
    user_id,
    status,
    appraisal_paid,
    property_type,
    created_at
FROM loan_requests
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Reset loan for payment testing
-- Replace 'YOUR_LOAN_ID' below with actual ID from Step 1

-- Reset appraisal payment status
UPDATE loan_requests 
SET 
    appraisal_paid = false,
    appraisal_payment_id = NULL,
    status = 'appraisal_ordered'
WHERE id = 'YOUR_LOAN_ID';

-- Delete previous payment records (optional - for clean testing)
DELETE FROM payments 
WHERE loan_id = 'YOUR_LOAN_ID' 
AND type = 'appraisal';

-- Step 3: Verify the loan is ready for payment
SELECT 
    id,
    user_id,
    status,
    appraisal_paid,
    property_type
FROM loan_requests
WHERE id = 'YOUR_LOAN_ID';

-- Expected result:
-- status = 'appraisal_ordered'
-- appraisal_paid = false

-- ============================================
-- TESTING FLOW:
-- ============================================
-- 1. Run queries above to reset loan
-- 2. Go to user panel: http://localhost:5173
-- 3. Open the loan detail page
-- 4. Click "Pay Appraisal Fee" button
-- 5. Use Stripe test card: 4242 4242 4242 4242
-- 6. Expiry: any future date (e.g., 12/28)
-- 7. CVC: any 3 digits (e.g., 123)
-- 8. Click "Pay" button

-- ============================================
-- CHECK PAYMENT RESULTS:
-- ============================================
SELECT 
    p.id,
    p.loan_id,
    p.amount,
    p.type,
    p.status,
    p.stripe_payment_intent_id,
    p.created_at,
    lr.user_id,
    lr.appraisal_paid
FROM payments p
JOIN loan_requests lr ON lr.id = p.loan_id
WHERE p.loan_id = 'YOUR_LOAN_ID'
ORDER BY p.created_at DESC;

-- Expected result after successful payment:
-- status = 'completed'
-- appraisal_paid = true in loan_requests table

-- ============================================
-- DELETE LOAN COMPLETELY (CASCADE)
-- ============================================
-- Use this to delete a loan and all related records
-- Replace 'YOUR_LOAN_ID' with actual loan ID

-- Delete in correct order to avoid FK constraint violations
DELETE FROM notifications WHERE loan_id = 'YOUR_LOAN_ID';
DELETE FROM email_queue WHERE loan_id = 'YOUR_LOAN_ID';
DELETE FROM loan_status_history WHERE loan_id = 'YOUR_LOAN_ID';
DELETE FROM payments WHERE loan_id = 'YOUR_LOAN_ID';
DELETE FROM documents WHERE loan_id = 'YOUR_LOAN_ID';
DELETE FROM needs_list_items WHERE loan_id = 'YOUR_LOAN_ID';
DELETE FROM closing_checklist WHERE loan_id = 'YOUR_LOAN_ID';
DELETE FROM loan_requests WHERE id = 'YOUR_LOAN_ID';

-- Verify deletion
SELECT COUNT(*) as remaining_loans FROM loan_requests;
