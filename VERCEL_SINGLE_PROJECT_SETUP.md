# Vercel Single Project Setup - Complete Guide

## ✅ Current Architecture (One Vercel Project)

Your project is already set up correctly:

```
fintech-crm/
├── api/
│   └── index.js          ← Express serverless function
├── backend/
│   └── src/              ← Backend routes and logic
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── dist/             ← Build output (auto-generated)
├── package.json          ← ROOT (build script)
└── vercel.json           ← Vercel configuration
```

## ✅ What's Already Configured

### 1. Root `package.json` ✅
```json
{
  "name": "fintech-crm",
  "private": true,
  "scripts": {
    "build": "cd frontend && npm install && npm run build"
  },
  "engines": {
    "node": "24.x"
  }
}
```

### 2. `vercel.json` ✅
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "frontend/dist",
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/frontend/dist/$1"
    }
  ],
  "functions": {
    "api/index.js": {
      "maxDuration": 30
    }
  }
}
```

### 3. Frontend Uses Relative URLs ✅
- `frontend/src/lib/api.ts` uses `/api` in production
- `frontend/src/lib/clerkApi.ts` uses `/api` in production
- **No CORS needed** - same origin!

### 4. API Uses Express ✅
- `api/index.js` uses Express (more powerful than plain functions)
- CORS configured as fallback (though not needed with relative URLs)
- All routes properly configured

## 🎯 How It Works

### Same Origin = No CORS

When frontend uses `/api/auth/me`:
1. Browser sees it as same-origin request
2. No preflight (OPTIONS) request needed
3. No CORS headers needed
4. Works on **any** preview URL automatically

### Vercel Routing

1. **`/api/*`** → Routes to `api/index.js` (Express serverless function)
2. **`/*`** → Routes to `frontend/dist/*` (Static frontend files)

## ✅ Vercel Dashboard Settings

Go to **Project → Settings → Build & Output Settings**:

| Setting | Value |
|---------|-------|
| Framework Preset | **Other** |
| Build Command | `npm run build` |
| Output Directory | `frontend/dist` |
| Node Version | `24.x` (or latest) |
| Install Command | `npm install` (default) |

## 🚀 Deployment Steps

### 1. Commit and Push
```bash
git add .
git commit -m "Configure single Vercel project setup"
git push
```

### 2. Verify Environment Variables

In **Vercel Dashboard → Settings → Environment Variables**:

**✅ Keep these:**
- `DATABASE_URL`
- `JWT_SECRET`
- `CLERK_SECRET_KEY` (if using Clerk)
- `FRONTEND_URL` (optional, for email links)

**❌ Remove this:**
- `VITE_API_URL` - **DELETE IT!** (forces relative URLs)

### 3. Deploy

Vercel will:
1. Run `npm run build` (builds frontend)
2. Deploy `frontend/dist` as static files
3. Deploy `api/index.js` as serverless function
4. Route requests automatically

## 🧪 Testing

### 1. Test API Endpoint
```bash
curl https://fintech-crm.vercel.app/api/health
```
Should return: `{"status":"ok","timestamp":"..."}`

### 2. Test Frontend
1. Visit: `https://fintech-crm.vercel.app`
2. Open DevTools → Network tab
3. Check API requests - should show `/api/...` (relative URL)
4. No CORS errors in console

### 3. Test Preview Deployment
1. Create a new commit (triggers preview)
2. Visit preview URL
3. Everything should work - no CORS issues!

## ✅ Benefits of This Setup

1. **No CORS Issues**
   - Relative URLs = same origin
   - Works on all preview deployments

2. **Simple Configuration**
   - One Vercel project
   - One domain
   - One deployment

3. **Fast Performance**
   - No preflight requests
   - No CORS overhead
   - Direct API calls

4. **Secure**
   - Same origin policy enforced
   - Credentials work automatically
   - No wildcard CORS

5. **Preview-Safe**
   - Any preview URL works automatically
   - No configuration needed per deployment

## 🔍 Troubleshooting

### Issue: Still seeing CORS errors

**Solution:**
1. Check if `VITE_API_URL` is set in Vercel env vars → **DELETE IT**
2. Hard refresh browser (Ctrl + Shift + R)
3. Check Network tab - requests should show `/api/...` not `https://...`

### Issue: API returns 404

**Solution:**
1. Check `vercel.json` routes are correct
2. Verify `api/index.js` exists
3. Check Vercel function logs

### Issue: Frontend not loading

**Solution:**
1. Check `outputDirectory` in `vercel.json` is `frontend/dist`
2. Verify build completes successfully
3. Check `frontend/dist` exists after build

## 📝 Key Points

✅ **DO:**
- Use relative URLs (`/api/...`) in frontend
- Keep Express setup (it's working fine)
- Use one Vercel project for frontend + backend
- Remove `VITE_API_URL` from environment variables

❌ **DON'T:**
- Don't use absolute URLs in frontend
- Don't set `VITE_API_URL` in production
- Don't create separate Vercel projects
- Don't hard-code preview URLs

## 🎉 Result

After this setup:
- ✅ One domain for everything
- ✅ No CORS issues ever
- ✅ Works on all preview deployments
- ✅ Simple, clean architecture
- ✅ Production-ready

Your setup is already correct! Just make sure:
1. `VITE_API_URL` is **not** set in Vercel
2. Frontend uses relative URLs (already done)
3. `vercel.json` is configured (already done)

That's it! 🚀


