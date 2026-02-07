# 🚨 Quick Fix: Clerk 422 Error

## ⚡ Immediate Action Required

The 422 error means Clerk is rejecting signups. **Fix this in Clerk Dashboard:**

### Step 1: Disable Bot Protection (90% of cases)

1. Go to: **https://dashboard.clerk.com**
2. Select your application: **resolved-oarfish-2**
3. Navigate to: **User & Authentication** → **Attack Protection**
4. **Turn OFF both toggles:**
   - ❌ "Enable bot sign-up protection"
   - ❌ "Enable bot sign-in protection"
5. Click **Save**

### Step 2: Remove Email Restrictions

1. In Clerk Dashboard → **User & Authentication** → **Restrictions**
2. **Remove ALL entries** from:
   - Allowlist
   - Blocklist
3. Click **Save**

### Step 3: Verify Email is Enabled

1. Clerk Dashboard → **User & Authentication** → **Email, Phone, Username**
2. Ensure **Email address**:
   - ✅ Toggle is **ON**
   - ✅ "Use as login identifier" is **checked**
   - ✅ "Require" is **checked**
3. Click **Save**

### Step 4: Clear Browser & Try Again

1. Open DevTools (F12)
2. **Application** tab → **Storage** → **Clear site data**
3. Close DevTools
4. **Hard refresh** (Ctrl+Shift+R)
5. Try signing up with a **new email address**

---

## ✅ After Fixing

1. **Signup should succeed** (no 422 error)
2. **User created in Clerk** → Check Clerk Dashboard → Users
3. **Sign in** → User automatically synced to database
4. **Check database** → User should appear

---

## 🔍 If Still Not Working

### Check the Exact Error:

1. **F12** → **Network** tab
2. Try signing up
3. Find `sign_ups` request (422)
4. Click it → **Response** tab
5. Read the JSON error message

### Common Error Codes:

| Error Code | Fix |
|-----------|-----|
| `captcha_invalid` | Disable bot protection |
| `form_identifier_exists` | Use different email |
| `form_password_pwned` | Use stronger password |
| `restriction_failed` | Remove email restrictions |
| `form_password_length_too_short` | Make password longer (8+ chars) |

---

## 📋 Checklist

- [ ] Bot protection disabled
- [ ] Email restrictions removed
- [ ] Email authentication enabled
- [ ] Browser data cleared
- [ ] Tried with new email
- [ ] Checked Network tab for exact error

---

**Most Important:** Disable bot protection in Clerk Dashboard! This fixes 90% of 422 errors.

