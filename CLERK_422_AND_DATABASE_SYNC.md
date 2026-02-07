# 🔍 Why User Isn't in Database: 422 Error Explained

## The Problem

You're getting a **422 error** when trying to sign up, which means:
- ❌ Clerk is **rejecting** the signup request
- ❌ User is **NOT created** in Clerk
- ❌ User is **NOT synced** to your database

**The user won't appear in your database until Clerk successfully creates them first.**

---

## 🔄 How User Sync Works

### Normal Flow (When Signup Works):

```
1. User fills signup form
   ↓
2. Clerk creates user ✅ (if 422, this FAILS)
   ↓
3. User verifies email
   ↓
4. User signs in
   ↓
5. Backend syncs user to database ✅
   (happens automatically in /api/auth/me)
```

### Current Flow (With 422 Error):

```
1. User fills signup form
   ↓
2. Clerk REJECTS signup (422 error) ❌
   ↓
3. User NOT created in Clerk ❌
   ↓
4. User can't sign in ❌
   ↓
5. User never synced to database ❌
```

---

## ✅ Solution: Fix the 422 Error First

**Step 1: Find the Exact Error**

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Try signing up again
4. Find the failed `sign_ups` request (422)
5. Click on it → **Response** tab
6. Read the error message

**Common errors:**
- `captcha_invalid` → Disable bot protection
- `form_identifier_exists` → Email already exists
- `form_password_pwned` → Password too weak
- `restriction_failed` → Email domain blocked

**Step 2: Fix in Clerk Dashboard**

### Most Common Fix: Disable Bot Protection

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your app: **resolved-oarfish-2**
3. Navigate to: **User & Authentication** → **Attack Protection**
4. **Turn OFF both toggles:**
   - ❌ "Enable bot sign-up protection"
   - ❌ "Enable bot sign-in protection"
5. Click **Save**

### Other Common Fixes:

**Remove Email Restrictions:**
1. Clerk Dashboard → **User & Authentication** → **Restrictions**
2. Remove all entries from **Allowlist** and **Blocklist**
3. Save

**Verify Email is Enabled:**
1. Clerk Dashboard → **User & Authentication** → **Email, Phone, Username**
2. Ensure **Email address** is:
   - ✅ Toggle ON
   - ✅ "Use as login identifier" checked
   - ✅ "Require" checked

**Step 3: Try Signing Up Again**

1. Clear browser data (F12 → Application → Clear site data)
2. Try signing up with a **new email address**
3. Use a strong password (at least 8 characters)

**Step 4: Verify User Creation**

After successful signup:
1. Check **Clerk Dashboard** → **Users** → You should see the new user
2. Sign in with the new account
3. Check your **database** → User should be automatically synced

---

## 🔄 How Database Sync Works

Users are **automatically synced** to your database when they:

1. **Sign in** (calls `/api/auth/me`)
2. **Access any protected route** (uses `requireClerkAuth` middleware)

### Sync Logic (in `backend/src/routes/auth.js`):

```javascript
// When user signs in:
1. Verify Clerk JWT token
2. Fetch user from Clerk API
3. Check if user exists in database
   - If NO → Create new user with role='borrower'
   - If YES → Update user data from Clerk
4. Return user data
```

### Sync Happens Automatically:

- ✅ On first sign-in (creates user)
- ✅ On every subsequent auth (updates user data)
- ✅ No webhook needed
- ✅ No manual sync required

---

## 🧪 Testing the Fix

### After Fixing 422 Error:

1. **Sign up** → Should succeed (no 422 error)
2. **Check Clerk Dashboard** → User should appear in Users list
3. **Sign in** → Should work
4. **Check database** → User should be automatically created

### Query Your Database:

```sql
-- Check if user exists
SELECT id, email, full_name, role, created_at 
FROM users 
WHERE email = 'your-email@example.com';

-- See all users
SELECT id, email, full_name, role, email_verified, created_at 
FROM users 
ORDER BY created_at DESC;
```

---

## 📋 Summary

**The Issue:**
- 422 error prevents Clerk from creating the user
- No user in Clerk = No user in database

**The Fix:**
1. Fix the 422 error (usually disable bot protection)
2. Sign up successfully
3. User will be created in Clerk
4. Sign in → User automatically synced to database

**Key Point:**
- Users are synced **on sign-in**, not on signup
- If signup fails (422), there's no user to sync
- Fix the 422 error first, then everything else works automatically

---

## 🚨 Quick Action

**Right now, do this:**

1. **Open DevTools (F12) → Network tab**
2. **Try signing up**
3. **Click on the failed `sign_ups` request**
4. **Read the Response tab** - this tells you exactly why it failed
5. **Fix based on the error** (usually disable bot protection)
6. **Try again** → User will be created in Clerk
7. **Sign in** → User automatically synced to database ✅

