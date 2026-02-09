# 🚀 Replit Deployment Guide

This project has been configured for standard Node.js deployment and is ready for Replit.

## ✅ Vercel Dependencies Removed

All Vercel-specific code has been removed:
- ✅ Deleted `vercel.json` files
- ✅ Removed serverless environment checks
- ✅ Removed `/tmp` file storage logic
- ✅ Server always starts (not conditional)
- ✅ Standard disk storage for all files
- ✅ Updated CORS for Replit domains

## 📋 Project Structure

```
RPC-Loan-HUB/
├── backend/
│   ├── src/
│   │   ├── server.js          # Express server (always starts)
│   │   ├── routes/            # API routes
│   │   ├── middleware/         # Auth & error handling
│   │   ├── services/           # Business logic
│   │   └── db/                 # Database config & migrations
│   ├── uploads/                # File storage directory
│   ├── package.json
│   └── .env                    # Environment variables
│
└── frontend/
    ├── src/                    # React source code
    ├── dist/                   # Built files (after npm run build)
    ├── package.json
    └── .env                    # Environment variables
```

## 🔧 Standard Node.js Commands

### Backend

```bash
cd backend

# Install dependencies
npm install

# Start server (production)
npm start
# Runs: node src/server.js

# Start server (development with auto-reload)
npm run dev
# Runs: nodemon src/server.js

# Run database migrations
npm run db:migrate
# Runs: node src/db/migrate.js
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Development server
npm run dev
# Runs: vite (usually on port 5173)

# Build for production
npm run build
# Output: frontend/dist/

# Preview production build
npm run preview
```

## 🌐 Replit Setup

### Option 1: Single Replit Project (Recommended)

**For Backend:**

1. **Create new Replit project**
   - Language: Node.js
   - Name: `rpc-loan-hub-backend`

2. **Upload backend files**
   - Upload entire `backend/` folder contents
   - Or connect to Git repository

3. **Set environment variables** (Replit Secrets):
   ```
   DATABASE_URL=postgresql://...
   PORT=3001
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-replit.replit.dev
   CLERK_SECRET_KEY=sk_test_...
   CLERK_PUBLISHABLE_KEY=pk_test_...
   JWT_SECRET=your-secret-key
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Configure Replit run command:**
   - In `.replit` file or Replit settings:
   ```toml
   run = "cd backend && npm start"
   ```

5. **Start the server:**
   - Click "Run" button in Replit
   - Server will start on port 3001 (or PORT from env)

**For Frontend:**

1. **Create new Replit project**
   - Language: Node.js
   - Name: `rpc-loan-hub-frontend`

2. **Upload frontend files**
   - Upload entire `frontend/` folder contents

3. **Set environment variables:**
   ```
   VITE_API_URL=http://localhost:3001/api
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   ```

4. **Build and serve:**
   ```bash
   npm install
   npm run build
   # Serve dist/ folder using a simple HTTP server
   ```

### Option 2: Monorepo in Single Replit

1. **Create Replit project**
   - Upload both `backend/` and `frontend/` folders

2. **Create `.replit` file:**
   ```toml
   run = "cd backend && npm start"
   
   [deploy]
   run = ["sh", "-c", "cd backend && npm install && npm start"]
   ```

3. **Use Replit's multi-file structure:**
   ```
   replit/
   ├── backend/
   │   └── (all backend files)
   └── frontend/
       └── (all frontend files)
   ```

## 🔐 Environment Variables

### Backend `.env` (or Replit Secrets)

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Server
PORT=3001
NODE_ENV=production

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-replit.replit.dev
# OR allow all origins (development)
ALLOW_ALL_ORIGINS=true

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# JWT (legacy auth)
JWT_SECRET=your-super-secret-jwt-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin (optional)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
```

### Frontend `.env`

```env
# API URL (use relative path in production, absolute for dev)
VITE_API_URL=http://localhost:3001/api

# Clerk
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## 📁 File Storage

All files are stored in:
- **Uploads:** `backend/uploads/`
- **Term Sheets:** `backend/uploads/term-sheets/`
- **Applications:** `backend/uploads/applications/`

**Important:** Ensure the `uploads/` directory exists and is writable:
```bash
mkdir -p backend/uploads/term-sheets
mkdir -p backend/uploads/applications
chmod -R 755 backend/uploads
```

## 🗄️ Database Setup

### Using External PostgreSQL (Recommended)

1. **Create database** (Neon, Supabase, Railway, etc.)
2. **Get connection string:**
   ```
   postgresql://user:password@host:5432/database
   ```
3. **Set `DATABASE_URL` in Replit Secrets**
4. **Run migrations:**
   ```bash
   cd backend
   npm run db:migrate
   ```

### Using SQLite (Development Only)

```env
DATABASE_URL=sqlite:./rpc_lending.db
```

## 🚀 Deployment Steps

### Backend Deployment

1. **Upload code to Replit**
2. **Set environment variables** (Replit Secrets)
3. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```
4. **Run database migrations:**
   ```bash
   npm run db:migrate
   ```
5. **Start server:**
   ```bash
   npm start
   ```
6. **Note the Replit URL:** `https://your-backend.replit.dev`

### Frontend Deployment

1. **Upload code to Replit**
2. **Set environment variables**
3. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```
4. **Build:**
   ```bash
   npm run build
   ```
5. **Update backend `FRONTEND_URL`** to point to frontend Replit URL
6. **Serve `dist/` folder** (use Replit's static file serving or a simple HTTP server)

## 🔄 CORS Configuration

The backend CORS is configured to allow:
- `localhost` (development)
- `FRONTEND_URL` from environment
- Replit domains (`replit.dev`, `replit.app`)

To allow all origins (development only):
```env
ALLOW_ALL_ORIGINS=true
```

## 📝 Testing

### Test Backend

```bash
# Health check
curl https://your-backend.replit.dev/api/health

# Should return: {"status":"ok","timestamp":"..."}
```

### Test Frontend

1. Open frontend Replit URL in browser
2. Should load the React app
3. Try signing in with Clerk

## 🐛 Troubleshooting

### Server won't start

- Check `PORT` environment variable
- Check database connection (`DATABASE_URL`)
- Check Replit logs for errors

### CORS errors

- Verify `FRONTEND_URL` is set correctly
- Or set `ALLOW_ALL_ORIGINS=true` for development
- Check backend logs for blocked origins

### File upload errors

- Ensure `backend/uploads/` directory exists
- Check file permissions
- Verify disk space in Replit

### Database connection errors

- Verify `DATABASE_URL` is correct
- Check if database allows connections from Replit IPs
- Test connection: `npm run db:migrate`

## 📚 Additional Resources

- **Replit Docs:** https://docs.replit.com
- **Node.js on Replit:** https://docs.replit.com/hosting/deployments/run-a-nodejs-app
- **Environment Variables:** https://docs.replit.com/programming-ide/storing-sensitive-information-environment-variables

## ✅ Checklist

Before deploying:

- [ ] Backend code uploaded to Replit
- [ ] Frontend code uploaded to Replit
- [ ] Environment variables set in Replit Secrets
- [ ] Database created and `DATABASE_URL` configured
- [ ] Database migrations run (`npm run db:migrate`)
- [ ] `uploads/` directory created
- [ ] Backend server starts successfully
- [ ] Frontend builds successfully
- [ ] CORS configured correctly
- [ ] Test health endpoint
- [ ] Test authentication flow

---

**The project is now ready for Replit deployment!** 🎉

