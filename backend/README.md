# RPC Lending Backend

Node.js/Express API for the Riverside Park Capital (RPC) Fintech Lending Portal.

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

## Demo Accounts

- **Borrower**: demo@example.com / demo123456
- **Operations**: ops@rpc-lending.com / ops123456

## Loan Products Supported

### Residential (1-4 Units)
- DSCR / Investor Rental Loans
- Fix & Flip / Value-Add Bridge
- Ground-Up Construction
- Investment HELOC (up to 90% LTV)

### Commercial (5+ Units)
- Multifamily Bridge
- Value-Add / Renovation
- Cash-Out Refinance
- Permanent Financing

### Documentation Types
- Full Documentation
- Light Doc (No Tax Returns)
- Bank Statement Program
- Streamline No-Doc (DSCR-based)

## DSCR Calculation

```
DSCR = NOI / Annual Debt Service
NOI = Annual Rental Income - Annual Operating Expenses

Example:
- Annual rental income: $120,000
- Annual operating expenses: $40,000
- NOI: $80,000
- Annual loan payments: $65,000
- DSCR = $80,000 ÷ $65,000 = 1.23x
```

**Auto-Decline Rule**: Loans with DSCR < 1.0x are automatically declined unless using Light Doc, Bank Statement, or No-Doc programs.

## Loan Status Flow

1. `new_request` - Initial loan request created
2. `quote_requested` - Borrower submitted for quote
3. `soft_quote_issued` - Soft quote generated (rate range based on credit/DSCR)
4. `term_sheet_issued` - Term sheet PDF generated
5. `term_sheet_signed` - Borrower accepted terms
6. `needs_list_sent` - Document checklist sent
7. `needs_list_complete` - All required docs uploaded
8. `submitted_to_underwriting` - File in review
9. `appraisal_ordered` - Appraisal in progress
10. `appraisal_received` - Value confirmed
11. `conditionally_approved` - Conditions issued
12. `conditional_commitment_issued` - Commitment letter ready
13. `clear_to_close` - All conditions satisfied
14. `closing_scheduled` - Closing date set
15. `funded` - Loan complete

## API Endpoints

### Auth
- `POST /api/auth/register` - Register borrower + create initial loan
- `POST /api/auth/login` - Login (returns JWT)
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Loans (Borrower)
- `GET /api/loans` - List user's loans
- `GET /api/loans/:id` - Get loan details with history
- `POST /api/loans` - Create new loan (duplicates borrower info)
- `PUT /api/loans/:id` - Update loan details
- `POST /api/loans/:id/submit` - Submit for quote
- `POST /api/loans/:id/credit-auth` - Credit authorization consent
- `POST /api/loans/:id/soft-quote` - Generate soft quote + term sheet
- `POST /api/loans/:id/sign-term-sheet` - Sign term sheet
- `POST /api/loans/:id/full-application` - Submit full application

### Documents
- `GET /api/documents/loan/:loanId` - Get documents with folder colors
- `GET /api/documents/needs-list/:loanId` - Get needs list
- `GET /api/documents/folders/:loanId` - Get folder summary
- `POST /api/documents/upload` - Upload document (multipart)
- `DELETE /api/documents/:id` - Delete document

### Payments
- `GET /api/payments/loan/:loanId` - Get payment status
- `POST /api/payments/appraisal-intent` - Create Stripe payment intent
- `POST /api/payments/confirm` - Confirm payment (dev mode)
- `POST /api/payments/webhook` - Stripe webhook

### Operations (Ops role required)
- `GET /api/operations/pipeline` - Pipeline with filters
- `GET /api/operations/stats` - Dashboard statistics
- `GET /api/operations/status-options` - Status dropdown options
- `GET /api/operations/loan/:id` - Full loan view
- `PUT /api/operations/loan/:id/status` - Update status (dropdown)
- `PUT /api/operations/loan/:id/assign` - Assign processor
- `POST /api/operations/loan/:id/needs-list` - Add document request
- `PUT /api/operations/needs-list/:id/review` - Review document
- `POST /api/operations/loan/:id/commitment` - Upload commitment
- `POST /api/operations/loan/:id/schedule-closing` - Schedule closing
- `POST /api/operations/loan/:id/fund` - Mark as funded
- `GET /api/operations/crm/search` - Search borrowers
- `GET /api/operations/crm/borrower/:id` - Borrower profile
- `GET /api/operations/processors` - List processors

### Profile
- `GET /api/profile` - Get profile
- `PUT /api/profile` - Update profile
- `GET /api/profile/notifications` - Get notifications
- `PUT /api/profile/notifications/:id/read` - Mark read

## Document Folder Colors

- **Tan/Beige**: No documents uploaded
- **Blue**: Has documents
- **Red**: New upload in last 24 hours

## Email Integration (HubSpot)

Emails are queued for:
- Welcome email on registration
- Needs list with upload link
- Document upload notifications to ops
- Soft quote ready
- Status updates

## Security Features

- JWT authentication with role-based access
- Password hashing (bcrypt, 12 rounds)
- Credit authorization with IP/timestamp logging
- Audit logs for all sensitive actions
- Input validation (express-validator)
- CORS configuration
- Helmet security headers
