# RPC Loan Hub - Loan Management System

A comprehensive loan management platform for processing and tracking loan applications from submission to closing.

## 🚀 Features

- **Borrower Portal**: Submit loan requests, track progress, upload documents
- **Operations Dashboard**: Manage loan pipeline, approve quotes, update statuses
- **Admin Dashboard**: View metrics, recent closings, and system overview
- **Document Management**: Secure file uploads and needs list tracking
- **Status Tracking**: Real-time loan progress tracking with visual indicators
- **Quote Generation**: Automated soft quote generation with term sheets
- **Email Notifications**: Automated email notifications for key milestones

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## 🔧 Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd __rpc-loan-hub
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/rpc_loan_hub
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
ALLOW_ALL_ORIGINS=true
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ADMIN_EMAIL=admin@rpc-lending.com
ADMIN_PASSWORD=admin123456
```

### 3. Database Setup

```bash
# Run migrations
node src/db/migrate.js

# Seed database with demo data (optional)
node src/db/seed.js
```

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:3001/api
```

### 5. Start Development Servers

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## 🔐 Default Login Credentials

**⚠️ IMPORTANT: Change these credentials in production!**

- **Admin**: `admin@rpc-lending.com` / `admin123456`
- **Operations**: `ops@rpc-lending.com` / `ops123456`
- **Borrower**: `demo@example.com` / `demo123456`

## 📁 Project Structure

```
__rpc-loan-hub/
├── backend/
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth & error handling
│   │   ├── services/      # Business logic
│   │   ├── db/            # Database migrations & seeds
│   │   └── server.js      # Express server
│   └── uploads/           # File uploads directory
├── frontend/
│   ├── src/
│   │   ├── pages/         # React pages
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   └── lib/           # API client & utilities
│   └── public/            # Static assets
└── README.md
```

## 🔒 Security Notes

- **Never commit `.env` files** - They contain sensitive credentials
- **Change default passwords** before deploying to production
- **Use strong JWT secrets** in production
- **Enable HTTPS** in production
- **Review CORS settings** for production deployment

## 🛠️ Available Scripts

### Backend
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `node src/db/migrate.js` - Run database migrations
- `node src/db/seed.js` - Seed database with demo data

### Frontend
- `npm run dev` - Start Vite development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-email` - Verify email address

### Loans
- `GET /api/loans` - List user's loans
- `POST /api/loans` - Create new loan request
- `GET /api/loans/:id` - Get loan details
- `POST /api/loans/:id/submit` - Submit loan request

### Operations
- `GET /api/operations/pipeline` - Get loan pipeline
- `GET /api/operations/stats` - Get pipeline statistics
- `POST /api/operations/loan/:id/approve-quote` - Approve quote request

## 🚢 Deployment

1. Set environment variables in your hosting platform
2. Run database migrations on production database
3. Build frontend: `cd frontend && npm run build`
4. Serve frontend build files
5. Start backend server with PM2 or similar process manager

## 📄 License

[Your License Here]

## 👥 Contributors

[Your Name/Team]

## 📧 Support

For support, email support@rpc-lending.com or open an issue in the repository.
