# CORS Fix for Vercel Deployment

## Problem
CORS errors when accessing API from Vercel preview deployments:
- Frontend: `https://fintech-6yn5eco1u-ohsprings-projects-7dd597a2.vercel.app`
- API: `https://fintech-crm.vercel.app`
- Error: "Response to preflight request doesn't pass access control check"

## Solution Applied

### 1. Updated CORS Configuration (`api/index.js`)
- ✅ Allows all Vercel preview deployments (pattern: `*.vercel.app`)
- ✅ Allows production URL explicitly
- ✅ Handles OPTIONS preflight requests
- ✅ Includes proper headers for credentials

### 2. Updated Frontend API Base URL
- ✅ Uses relative URLs (`/api`) in production when `VITE_API_URL` is not set
- ✅ Falls back to `VITE_API_URL` if explicitly set
- ✅ Uses localhost for local development

## Changes Made

### `api/index.js`
```javascript
// Now allows:
// - All Vercel preview deployments (*.vercel.app)
// - Production URL (fintech-crm.vercel.app)
// - Localhost for development
// - Explicit OPTIONS handling
```

### `frontend/src/lib/api.ts` & `frontend/src/lib/clerkApi.ts`
```typescript
// Uses relative URL in production to avoid CORS
// Falls back to VITE_API_URL if set
```

## Deployment Steps

1. **Commit and push:**
   ```bash
   git add api/index.js frontend/src/lib/api.ts frontend/src/lib/clerkApi.ts
   git commit -m "Fix CORS for Vercel preview deployments"
   git push
   ```

2. **Vercel will auto-deploy** - no manual steps needed

3. **Test the fix:**
   - Visit your preview deployment
   - Check browser console - CORS errors should be gone
   - Test API calls (login, fetch data, etc.)

## Environment Variables (Optional)

If you want to use absolute URLs instead of relative:

**In Vercel Dashboard → Settings → Environment Variables:**

For **Production:**
```
VITE_API_URL=https://fintech-crm.vercel.app/api
```

For **Preview:**
```
VITE_API_URL=https://fintech-crm.vercel.app/api
```
(Use production API URL for preview deployments too)

**Note:** With the CORS fix, you don't need to set `VITE_API_URL` - relative URLs will work automatically.

## How It Works

1. **CORS Pattern Matching:**
   - Any URL matching `*.vercel.app` is automatically allowed
   - This includes all preview deployments

2. **Relative URLs:**
   - When frontend and backend are on the same Vercel project, using `/api` avoids CORS entirely
   - Browser treats it as same-origin request

3. **OPTIONS Preflight:**
   - Explicitly handled with `app.options('*', cors(corsOptions))`
   - Ensures preflight requests succeed

## Verification

After deployment, test:

```bash
# Should return CORS headers
curl -H "Origin: https://fintech-6yn5eco1u-ohsprings-projects-7dd597a2.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://fintech-crm.vercel.app/api/health

# Should return data
curl https://fintech-crm.vercel.app/api/health
```

## Troubleshooting

If CORS errors persist:

1. **Check Vercel logs:**
   - Go to Deployments → Latest → Functions
   - Look for CORS-related errors

2. **Verify environment variables:**
   - `FRONTEND_URL` should be set to production URL
   - `ALLOW_ALL_ORIGINS` can be set to `true` for testing (not recommended for production)

3. **Hard refresh browser:**
   - Ctrl + Shift + R (Windows/Linux)
   - Cmd + Shift + R (Mac)

4. **Check network tab:**
   - Look for OPTIONS request
   - Verify response headers include `Access-Control-Allow-Origin`

## Best Practice

✅ **Recommended:** Use relative URLs (`/api`) when frontend and backend are on the same Vercel project

✅ **Alternative:** Set `VITE_API_URL` to production API URL for all environments

❌ **Not recommended:** Setting `ALLOW_ALL_ORIGINS=true` in production (security risk)

