# Fix: 500 Error on /api/auth/me with Clerk

## 🔍 Problem

The `/api/auth/me` endpoint returns 500 Internal Server Error when using Clerk authentication.

## Root Cause

The code was using `getAuth(req)` from `@clerk/express`, which requires the Clerk Express middleware to be applied to the Express app. In a Vercel serverless function context, this middleware isn't automatically applied, causing `getAuth(req)` to fail.

## ✅ Solution Applied

Updated `backend/src/middleware/clerkAuth.js` to:
- Use `verifyToken()` from `@clerk/backend` instead of `getAuth()` from `@clerk/express`
- Manually verify the JWT token from the `Authorization` header
- Works in both Express and serverless contexts

## 📋 Changes Made

### `backend/src/middleware/clerkAuth.js`
- ✅ Removed dependency on `@clerk/express`'s `getAuth()`
- ✅ Now uses `verifyToken()` from `@clerk/backend`
- ✅ Verifies Bearer token from Authorization header
- ✅ Works in serverless functions

## 🚨 Required Environment Variables

Make sure these are set in **Vercel Dashboard → Settings → Environment Variables**:

```env
CLERK_SECRET_KEY=sk_test_... (or sk_live_...)
CLERK_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
```

## 🚀 Deployment Steps

1. **Commit and push:**
   ```bash
   git add backend/src/middleware/clerkAuth.js
   git commit -m "Fix Clerk auth for serverless - use verifyToken instead of getAuth"
   git push
   ```

2. **Verify environment variables in Vercel:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Ensure `CLERK_SECRET_KEY` is set
   - Ensure `CLERK_PUBLISHABLE_KEY` is set
   - Ensure `VITE_CLERK_PUBLISHABLE_KEY` is set

3. **Redeploy:**
   - Vercel will auto-deploy on push
   - Or manually redeploy from dashboard

4. **Test:**
   - Visit your site and try to sign in
   - Check browser console for errors
   - Check Vercel function logs for any errors

## 🧪 How to Verify the Fix

### 1. Check Vercel Function Logs
1. Go to Vercel Dashboard → Deployments → Latest
2. Click "Functions" tab
3. Click on `/api/auth/me`
4. Check logs for errors

### 2. Test the Endpoint
```bash
# Get a Clerk token (from browser after sign-in)
# Then test:
curl -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
     https://your-project.vercel.app/api/auth/me
```

### 3. Check Browser Console
- Should see successful API calls
- No 500 errors
- User data should load correctly

## 🔍 Troubleshooting

### Still Getting 500 Error?

1. **Check CLERK_SECRET_KEY:**
   - Verify it's set in Vercel environment variables
   - Should start with `sk_test_` or `sk_live_`
   - Check Vercel function logs for "CLERK_SECRET_KEY not configured"

2. **Check Token Format:**
   - Frontend should send: `Authorization: Bearer <token>`
   - Token should be a valid Clerk JWT
   - Check browser Network tab → Headers → Authorization

3. **Check Database Connection:**
   - Verify `DATABASE_URL` is set correctly
   - Check Vercel logs for database connection errors
   - Ensure database allows connections from Vercel

4. **Check Clerk Token:**
   - Token should be obtained from Clerk after sign-in
   - Frontend should call `getToken()` from Clerk
   - Token should be sent in Authorization header

## 📝 How It Works Now

### Before (❌ Broken):
```javascript
// Required Clerk Express middleware (not available in serverless)
const authResult = getAuth(req); // ❌ Fails in serverless
```

### After (✅ Fixed):
```javascript
// Works in both Express and serverless
const token = req.headers.authorization.replace('Bearer ', '');
const payload = await verifyToken(token, {
  secretKey: process.env.CLERK_SECRET_KEY
}); // ✅ Works everywhere
```

## ✅ Expected Behavior

After the fix:
- ✅ `/api/auth/me` returns 200 with user data
- ✅ No 500 errors
- ✅ Clerk authentication works correctly
- ✅ Works in both development and production

## 🎯 Summary

✅ **Fixed:** Clerk auth now uses `verifyToken()` instead of `getAuth()`
✅ **Fixed:** Works in serverless function context
✅ **Action Required:** Verify `CLERK_SECRET_KEY` is set in Vercel
✅ **Action Required:** Redeploy to apply changes

The 500 error should now be resolved! 🎉


