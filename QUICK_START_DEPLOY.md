# Quick Start - Deploy to Vercel in 10 Minutes

## 🚀 Fast Track

### 1. Push Code (2 min)
```bash
git add .
git commit -m "Add Vercel deployment config"
git push
```

### 2. Set Up Database (3 min)
- Go to [supabase.com](https://supabase.com) → Create project
- Copy connection string from Settings → Database

### 3. Deploy to Vercel (2 min)
- Go to [vercel.com/new](https://vercel.com/new)
- Import your repository
- Click Deploy (will fail - that's OK)

### 4. Add Environment Variables (2 min)
In Vercel Dashboard → Settings → Environment Variables, add:

**Required:**
```
DATABASE_URL=your-supabase-connection-string
JWT_SECRET=run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-project.vercel.app (update after deploy)
ALLOW_ALL_ORIGINS=false
ADMIN_EMAIL=admin@rpc-lending.com
ADMIN_PASSWORD=your-password
NODE_ENV=production
VITE_API_URL=https://your-project.vercel.app/api (update after deploy)
```

### 5. Redeploy (1 min)
- Deployments → Three dots → Redeploy

### 6. Run Migrations (2 min)
```bash
npm install -g vercel
vercel login
vercel link
vercel env pull .env.local
cd backend
node src/db/migrate.js
```

### 7. Create Admin
```bash
cd backend
node src/db/create-admin.js
```

### 8. Update URLs
- Update `FRONTEND_URL` and `VITE_API_URL` with actual Vercel URL
- Redeploy

## ✅ Done!

Visit: `https://your-project.vercel.app`

## ⚠️ Important

- **File Storage**: You'll need to configure cloud storage (Vercel Blob or Supabase Storage) for file uploads to work
- **HubSpot & Stripe**: Not required - can skip for now

## 📚 Full Guide

See `VERCEL_DEPLOYMENT.md` for detailed instructions.

