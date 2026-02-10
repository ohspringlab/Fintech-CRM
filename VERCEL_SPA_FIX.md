# Fix: 404 Error for SPA Routes on Vercel

## 🔍 Problem

Client-side routes like `/clerk-signup` return 404 because Vercel tries to serve them as static files, but they're handled by React Router.

## ✅ Solution

Use `rewrites` in `vercel.json` to:
1. Route `/api/*` to the serverless function
2. Serve `index.html` for all other routes (SPA fallback)

Vercel automatically serves static files (JS, CSS, images) if they exist, and only rewrites non-existent paths to `index.html`.

## 📋 Configuration

### `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.js"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "functions": {
    "api/index.js": {
      "maxDuration": 30
    }
  }
}
```

## 🚀 How It Works

1. **API Routes**: `/api/*` → Serverless function
2. **Static Files**: Automatically served if they exist (JS, CSS, images, etc.)
3. **SPA Routes**: Everything else → `index.html` → React Router handles it

## 📝 Important Notes

- **Static files are served first**: Vercel checks if a file exists before applying rewrites
- **Only non-existent paths** are rewritten to `index.html`
- **No need to exclude file extensions** in the rewrite pattern - Vercel handles this automatically

## 🚀 Deployment

1. **Commit and push:**
   ```bash
   git add vercel.json
   git commit -m "Fix SPA routing with rewrites"
   git push
   ```

2. **Vercel will auto-deploy**

3. **Test:**
   - Visit: `https://your-project.vercel.app/clerk-signup`
   - Should load correctly (no 404)
   - All client-side routes should work

## ✅ Expected Behavior

- ✅ `/clerk-signup` → Loads sign-up page
- ✅ `/clerk-signin` → Loads sign-in page
- ✅ `/dashboard` → Loads dashboard
- ✅ `/api/health` → Returns API response
- ✅ `/assets/...` → Serves static files
- ✅ `/favicon.ico` → Serves favicon

## 🐛 Troubleshooting

If routes still return 404:

1. **Check build output:**
   - Verify `frontend/dist/index.html` exists after build
   - Check Vercel build logs

2. **Verify outputDirectory:**
   - Should be `frontend/dist`
   - Matches where Vite builds to

3. **Clear cache and redeploy:**
   - Vercel Dashboard → Deployments → Redeploy
   - ✅ Check "Clear Cache and Build Artifacts"

4. **Check Vercel logs:**
   - Go to Function logs
   - Look for routing errors

## 🎯 Result

After this fix:
- ✅ All SPA routes work
- ✅ API routes work
- ✅ Static files served correctly
- ✅ No more 404 errors for client-side routes






