# 🚀 Quick Deployment Guide for Vercel

Your project is ready to deploy! Follow these steps:

## ✅ Pre-Deployment Checklist

- [x] `vercel.json` configured
- [x] `api/index.js` serverless function ready
- [x] Frontend build configuration set
- [x] Logo and favicon updated

## 📋 Step-by-Step Deployment

### Step 1: Push to GitHub/GitLab/Bitbucket

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### Step 2: Deploy to Vercel

1. **Go to [vercel.com/new](https://vercel.com/new)**
2. **Sign in** with GitHub/GitLab/Bitbucket
3. **Import your repository**
4. **Configure project:**
   - Framework Preset: **Other** (or **Vite** if available)
   - Root Directory: **`./`** (root)
   - Build Command: Leave empty (auto-detected)
   - Output Directory: Leave empty (handled by `vercel.json`)
   - Install Command: Leave as default
5. **Click "Deploy"**

### Step 3: Set Environment Variables

After the first deployment (it may fail without env vars), go to:
**Project Settings → Environment Variables**

Add these variables for **Production, Preview, and Development**:

#### Required Backend Variables:

```env
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# JWT Authentication
JWT_SECRET=[Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
JWT_EXPIRES_IN=7d

# Application URLs (Update after first deployment)
FRONTEND_URL=https://your-project-name.vercel.app
VITE_API_URL=https://your-project-name.vercel.app/api

# CORS
ALLOW_ALL_ORIGINS=false

# Admin Account
ADMIN_EMAIL=admin@rpc-lending.com
ADMIN_PASSWORD=[Your secure password]

# Environment
NODE_ENV=production
```

#### Clerk Authentication (If using Clerk):

```env
# Backend
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Frontend
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

#### Optional Variables:

```env
# Stripe (if using payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# File Storage (if using Vercel Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

### Step 4: Set Up Database

Choose a free PostgreSQL database:

**Option A: Supabase (Recommended)**
1. Go to [supabase.com](https://supabase.com)
2. Create free account → New project
3. Copy connection string from Settings → Database
4. Add to `DATABASE_URL` in Vercel

**Option B: Vercel Postgres**
1. Vercel Dashboard → Storage → Create Database → Postgres
2. Copy connection string
3. Add to `DATABASE_URL` in Vercel

**Option C: Neon**
1. Go to [neon.tech](https://neon.tech)
2. Create free project
3. Copy connection string
4. Add to `DATABASE_URL` in Vercel

### Step 5: Redeploy

1. Go to **Deployments** tab
2. Click **⋯** on latest deployment
3. Click **Redeploy**
4. Wait for build (~2-3 minutes)

### Step 6: Run Database Migrations

After successful deployment, run migrations:

**Option A: Using Vercel CLI (Recommended)**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migrations
cd backend
node src/db/migrate.js
```

**Option B: Create Migration Endpoint**

Create `api/migrate.js`:
```javascript
const { pool } = require('../backend/src/db/config');
const migrate = require('../backend/src/db/migrate');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const migrationSecret = process.env.MIGRATION_SECRET || 'change-this-secret';
  
  if (authHeader !== `Bearer ${migrationSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await migrate();
    res.json({ success: true, message: 'Migrations completed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

Then add `MIGRATION_SECRET` to Vercel env vars and call:
```bash
curl -X POST https://your-project.vercel.app/api/migrate \
  -H "Authorization: Bearer YOUR_SECRET"
```

### Step 7: Create Admin Account

After migrations:

```bash
cd backend
node src/db/create-admin.js
```

Or use seed script:
```bash
cd backend
node src/db/seed.js
```

### Step 8: Update URLs

After deployment, update these environment variables with your actual Vercel URL:

1. Go to **Settings → Environment Variables**
2. Update:
   - `FRONTEND_URL` → `https://your-project.vercel.app`
   - `VITE_API_URL` → `https://your-project.vercel.app/api`
3. **Redeploy** to apply changes

### Step 9: Configure Clerk Webhook (If using Clerk)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → Webhooks
2. Click **Add Endpoint**
3. Enter: `https://your-project.vercel.app/api/clerk/webhook`
4. Select events:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
   - ✅ `email.created`
   - ✅ `email.updated`
5. Copy **Signing Secret** and add to Vercel as `CLERK_WEBHOOK_SECRET`

## ✅ Post-Deployment Verification

Test these endpoints:

1. **Health Check:**
   ```
   https://your-project.vercel.app/api/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend:**
   ```
   https://your-project.vercel.app
   ```
   Should load your React app

3. **Test Login:**
   - Try logging in with admin credentials
   - Verify authentication works

## 🐛 Common Issues

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel uses 18.x by default)

### API Returns 404
- Check `vercel.json` routes configuration
- Verify `api/index.js` exists
- Check deployment logs

### Database Connection Fails
- Verify `DATABASE_URL` format is correct
- Check database allows external connections
- Ensure SSL is enabled (`?sslmode=require`)

### CORS Errors
- Set `FRONTEND_URL` to your actual Vercel URL
- Or temporarily set `ALLOW_ALL_ORIGINS=true` for testing

### File Upload Errors
- Must use cloud storage (can't use local filesystem on Vercel)
- Consider Vercel Blob or Supabase Storage
- Check file size limits (4.5MB for serverless functions)

## 📝 Important Notes

1. **File Storage**: Local file storage won't work on Vercel. You need cloud storage (Vercel Blob, Supabase Storage, etc.)

2. **Database**: Use a managed PostgreSQL service. Vercel serverless functions can't host databases.

3. **Environment Variables**: Set them in Vercel dashboard, not in `.env` files.

4. **Free Tier Limits**:
   - Vercel: 100GB bandwidth/month, unlimited requests
   - Supabase: 500MB database, unlimited API requests
   - Vercel Blob: 256MB storage, 100GB bandwidth/month

## 🎉 You're Done!

Your app should now be live at `https://your-project.vercel.app`

For custom domain setup, see [Vercel documentation](https://vercel.com/docs/concepts/projects/domains).

