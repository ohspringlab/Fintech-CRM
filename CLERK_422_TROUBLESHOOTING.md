# 🔧 Clerk 422 Error Troubleshooting

## The Problem
You're getting a **422 (Unprocessable Content)** error when trying to sign up, which means Clerk is rejecting the sign-up request.

## Common Causes & Solutions

### 1. ✅ **Bot Protection / CAPTCHA Issues** (Most Likely)
The Cloudflare Turnstile errors indicate CAPTCHA problems.

**Solution:**
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click on your application
3. Go to **User & Authentication** → **Attack Protection**
4. **Disable CAPTCHA for testing**:
   - Turn off "Enable bot sign-up protection"
   - Turn off "Enable bot sign-in protection"
5. Save and try signing up again

### 2. 🔒 **Email Domain Restrictions**
Your Clerk instance might be restricting email domains.

**Solution:**
1. In Clerk Dashboard → **User & Authentication** → **Restrictions**
2. Check **Allowlist** and **Blocklist** sections
3. Make sure your email domain isn't blocked
4. For development, **remove all restrictions**

### 3. 📧 **Email Address Not Enabled**
Email authentication might not be properly enabled.

**Solution:**
1. Clerk Dashboard → **User & Authentication** → **Email, Phone, Username**
2. Ensure **Email address** is:
   - ✅ Enabled (toggle ON)
   - ✅ Set as a login identifier
   - ✅ "Require" is checked
3. **Email verification**: Set to "Required" or "Optional" (not "Off")

### 4. 🔑 **Password Settings**
Password requirements might be too strict or misconfigured.

**Solution:**
1. Clerk Dashboard → **User & Authentication** → **Email, Phone, Username**
2. Click on **Password**
3. Check password requirements:
   - Minimum length (try 8 characters)
   - Don't require too many character types for testing
4. Save changes

### 5. 🌐 **Development Instance Limits**
Development instances have rate limits.

**Solution:**
1. Wait a few minutes if you've been testing a lot
2. Check Clerk Dashboard → **Settings** → **Usage**
3. See if you've hit any limits

### 6. ⚙️ **Application Settings**
Some settings might be preventing sign-ups.

**Solution:**
1. Clerk Dashboard → **Settings** → **General**
2. Check these settings:
   - **Allow sign-ups**: Make sure this is enabled
   - **Progressive sign-up**: Can leave enabled
   - **Session lifetime**: Check it's reasonable (default is fine)

### 7. 🔧 **Clear State and Try Again**

**In your browser:**
1. Open DevTools (F12)
2. Go to **Application** tab → **Storage**
3. Click "Clear site data"
4. Refresh the page
5. Try signing up again with a **new email address**

## Quick Fix Steps (Do These Now)

### Step 1: Disable Bot Protection
```
Clerk Dashboard → Attack Protection → Turn OFF both CAPTCHA toggles
```

### Step 2: Remove Email Restrictions
```
Clerk Dashboard → Restrictions → Remove all allowlist/blocklist entries
```

### Step 3: Verify Email Settings
```
Clerk Dashboard → Email, Phone, Username → Email address = ON
```

### Step 4: Clear Browser Data
```
F12 → Application → Clear site data → Refresh
```

### Step 5: Try Again
```
Use a different email address you haven't tried yet
```

## Still Not Working?

### Check Backend Connection
1. Make sure backend is running: `http://localhost:3001/api/health`
2. Should return: `{"status":"ok",...}`

### Verify Environment Variables
**Backend `.env`:**
```env
CLERK_SECRET_KEY=sk_test_...  (should start with sk_test_)
CLERK_PUBLISHABLE_KEY=pk_test_...  (should start with pk_test_)
```

**Frontend `.env`:**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...  (same as backend)
```

### Check Keys Match
Both backend and frontend should use the **same publishable key**.

### Restart Servers
```bash
# Stop both servers (Ctrl+C)

# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## Debug in Clerk Dashboard

1. Go to **Users** in Clerk Dashboard
2. See if any sign-up attempts appear (even failed ones)
3. Check **Logs** section for error details

## Alternative: Use Clerk Development Mode

If all else fails, try this simpler approach:

1. Clerk Dashboard → **User & Authentication** → **Email, Phone, Username**
2. Temporarily **disable email verification**:
   - Uncheck "Verify at sign-up"
   - This lets you test without email verification
3. Save and try signing up

## Test with Simple Email

Try signing up with a simple Gmail/Outlook email:
- ✅ `test@gmail.com`
- ✅ `test@outlook.com`
- ❌ Avoid unusual domains that might be flagged

## Need More Help?

1. Check browser console for the exact error message in the 422 response
2. Check Network tab → Find the `/sign_ups` request → Preview/Response
3. The response body will tell you exactly why it failed

---

**Most Common Fix:** Disable bot protection in Clerk Dashboard → Attack Protection → Turn off CAPTCHA toggles!
