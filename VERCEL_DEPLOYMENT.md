# Vercel Deployment Guide - Step by Step

This guide will walk you through deploying your RPC Loan Hub application on Vercel.

## 📋 Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) (free)
2. **Git Repository**: Your code should be on GitHub, GitLab, or Bitbucket
3. **PostgreSQL Database**: Set up a free database (see Step 2)

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Code

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Add Vercel deployment configuration"
   git push
   ```

2. **Verify files are created:**
   - ✅ `api/index.js` - Serverless function entry point
   - ✅ `vercel.json` - Vercel configuration
   - ✅ `.gitignore` - Updated to exclude build files

### Step 2: Set Up Database (FREE)

Choose one of these free options:

#### Option A: Supabase (Recommended - Easiest)
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" → Sign up (free)
3. Create a new project
4. Wait for database to be ready (~2 minutes)
5. Go to **Settings** → **Database**
6. Copy the **Connection string** (URI format)
   - It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`

#### Option B: Vercel Postgres
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Storage** → **Create Database** → **Postgres**
3. Create database and copy connection string

#### Option C: Neon (Free Tier)
1. Go to [neon.tech](https://neon.tech)
2. Sign up and create a project
3. Copy the connection string

**Save your database connection string - you'll need it in Step 4!**

### Step 3: Deploy to Vercel

1. **Go to Vercel:**
   - Visit [vercel.com/new](https://vercel.com/new)
   - Sign in with GitHub/GitLab/Bitbucket

2. **Import Your Repository:**
   - Click "Import" next to your repository
   - Or click "Add New..." → "Project" → Select your repo

3. **Configure Project:**
   - **Framework Preset**: Leave as "Other" (or "Vite" if available)
   - **Root Directory**: `./` (root)
   - **Build Command**: Leave empty (handled by `vercel.json`)
   - **Output Directory**: Leave empty (handled by `vercel.json`)
   - **Install Command**: Leave as default

4. **Click "Deploy"**
   - First deployment will fail (no environment variables yet)
   - That's OK! We'll fix it in the next step

### Step 4: Set Environment Variables

After first deployment:

1. **Go to Project Settings:**
   - In Vercel dashboard, click your project
   - Go to **Settings** → **Environment Variables**

2. **Add Backend Variables:**
   Click "Add" for each variable below:

   ```
   DATABASE_URL
   Value: postgresql://user:password@host:port/database?sslmode=require
   Environment: Production, Preview, Development
   ```

   ```
   JWT_SECRET
   Value: [Generate a random 32+ character string]
   Environment: Production, Preview, Development
   ```
   *Generate secret: Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`*

   ```
   JWT_EXPIRES_IN
   Value: 7d
   Environment: Production, Preview, Development
   ```

   ```
   FRONTEND_URL
   Value: https://your-project-name.vercel.app
   Environment: Production, Preview, Development
   ```
   *Replace with your actual Vercel URL after first deployment*

   ```
   ALLOW_ALL_ORIGINS
   Value: false
   Environment: Production, Preview, Development
   ```

   ```
   ADMIN_EMAIL
   Value: admin@rpc-lending.com
   Environment: Production, Preview, Development
   ```

   ```
   ADMIN_PASSWORD
   Value: [Your secure password]
   Environment: Production, Preview, Development
   ```

   ```
   NODE_ENV
   Value: production
   Environment: Production, Preview, Development
   ```

3. **Add Frontend Variable:**
   ```
   VITE_API_URL
   Value: https://your-project-name.vercel.app/api
   Environment: Production, Preview, Development
   ```
   *Replace with your actual Vercel URL*

4. **Optional Variables (Skip for now):**
   - `HUBSPOT_API_KEY` - Not required
   - `STRIPE_SECRET_KEY` - Not required
   - `BLOB_READ_WRITE_TOKEN` - Only if using Vercel Blob for file storage

### Step 5: Redeploy

1. **Go to Deployments tab**
2. Click the **three dots (⋯)** on the latest deployment
3. Click **Redeploy**
4. Wait for build to complete (~2-3 minutes)

### Step 6: Run Database Migrations

After successful deployment:

**Option A: Using Vercel CLI (Recommended)**

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Link to your project:**
   ```bash
   vercel link
   ```
   - Select your project
   - Select your scope

4. **Pull environment variables:**
   ```bash
   vercel env pull .env.local
   ```

5. **Run migrations:**
   ```bash
   cd backend
   node src/db/migrate.js
   ```

**Option B: Using Migration Endpoint**

Create `api/migrate.js`:
```javascript
require('dotenv').config();
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

Then:
1. Add `MIGRATION_SECRET` to Vercel environment variables
2. Call: `curl -X POST https://your-project.vercel.app/api/migrate -H "Authorization: Bearer YOUR_SECRET"`

### Step 7: Create Admin Account

After migrations:

```bash
cd backend
node src/db/create-admin.js
```

Or use the seed script:
```bash
cd backend
node src/db/seed.js
```

### Step 8: Configure File Storage (IMPORTANT)

Your app currently uses local file storage which won't work on Vercel. You need cloud storage.

**Option A: Vercel Blob (Recommended)**

1. **Install Vercel Blob:**
   ```bash
   cd backend
   npm install @vercel/blob
   ```

2. **Get Blob Token:**
   - Vercel Dashboard → **Storage** → **Create** → **Blob**
   - Create a new blob store
   - Copy the `BLOB_READ_WRITE_TOKEN`

3. **Add to Environment Variables:**
   ```
   BLOB_READ_WRITE_TOKEN
   Value: vercel_blob_rw_...
   Environment: Production, Preview, Development
   ```

4. **Update `backend/src/routes/documents.js`:**
   - See the file upload section in the main deployment guide
   - Replace multer disk storage with Vercel Blob

**Option B: Supabase Storage (Free)**
- Similar setup using Supabase Storage SDK

### Step 9: Test Your Deployment

1. **Health Check:**
   Visit: `https://your-project.vercel.app/api/health`
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend:**
   Visit: `https://your-project.vercel.app`
   Should load your React app

3. **Test Login:**
   - Try logging in with admin credentials
   - Verify authentication works

4. **Test File Upload:**
   - If file storage is configured, test uploading a document

### Step 10: Update FRONTEND_URL

After deployment, update the `FRONTEND_URL` environment variable:
1. Go to **Settings** → **Environment Variables**
2. Edit `FRONTEND_URL` with your actual Vercel URL
3. Edit `VITE_API_URL` with your actual Vercel URL + `/api`
4. Redeploy

## ✅ Post-Deployment Checklist

- [ ] Database migrations completed successfully
- [ ] Admin account created
- [ ] Health endpoint working (`/api/health`)
- [ ] Frontend loads correctly
- [ ] Authentication working (login/register)
- [ ] File uploads working (if configured)
- [ ] CORS configured correctly
- [ ] All environment variables set
- [ ] `FRONTEND_URL` updated with actual URL

## 🐛 Troubleshooting

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
- Must use cloud storage (can't use local filesystem)
- Check file size limits (4.5MB for serverless functions)
- Verify storage credentials

## 📝 Important Notes

1. **File Uploads**: You MUST migrate to cloud storage. Local file storage won't work on Vercel.

2. **Database**: Use a managed PostgreSQL service. Vercel serverless functions can't host databases.

3. **Environment Variables**: Set them in Vercel dashboard, not in `.env` files.

4. **Free Tier Limits**:
   - Vercel: 100GB bandwidth/month, unlimited requests
   - Supabase: 500MB database, unlimited API requests
   - Vercel Blob: 256MB storage, 100GB bandwidth/month

## 🎉 You're Done!

Your app should now be live at `https://your-project.vercel.app`

For custom domain setup, see Vercel documentation.

