# Fix: 404 Error for SPA Routes (e.g., /clerk-signup)

## 🔍 Problem

When navigating to client-side routes like `/clerk-signup`, Vercel returns a 404 error because it tries to serve them as static files, but they don't exist. These routes are handled by React Router on the client side.

## ✅ Solution

Updated `vercel.json` to use **rewrites** that:
1. Route `/api/*` to the API serverless function
2. Serve `index.html` for all other routes (SPA fallback)

This allows React Router to handle all client-side routes.

## 📋 Changes Made

### `vercel.json`
- Added `rewrites` section
- API routes go to `/api/index.js`
- All other routes serve `/index.html` (which loads React Router)

## 🚀 Deployment

1. **Commit and push:**
   ```bash
   git add vercel.json
   git commit -m "Fix SPA routing - serve index.html for client-side routes"
   git push
   ```

2. **Vercel will auto-deploy**

3. **Test:**
   - Visit: `https://your-project.vercel.app/clerk-signup`
   - Should load the sign-up page (no 404)
   - All client-side routes should work

## ✅ How It Works

### Before (❌ Broken):
```
/clerk-signup → Vercel looks for file → 404 Not Found
```

### After (✅ Fixed):
```
/clerk-signup → Rewrite to /index.html → React Router handles route
```

## 🧪 Routes That Should Now Work

All React Router routes should work:
- ✅ `/clerk-signup`
- ✅ `/clerk-signin`
- ✅ `/dashboard`
- ✅ `/dashboard/loans/:loanId`
- ✅ `/ops`
- ✅ `/admin`
- ✅ Any other client-side route

## 📝 Technical Details

The `rewrites` in `vercel.json`:
- **Priority**: Rewrites are checked before routes
- **API routes**: `/api/*` → serverless function
- **SPA routes**: Everything else → `index.html`
- **Static files**: Vercel automatically serves files from `frontend/dist` if they exist

## 🎯 Result

✅ All client-side routes work
✅ No more 404 errors for SPA routes
✅ API routes still work correctly
✅ Static assets still served correctly


