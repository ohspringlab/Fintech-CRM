# 🔍 How to Debug Clerk 422 Error

## Step-by-Step: Find the Exact Error Message

The 422 error means Clerk is rejecting your signup request. Here's how to see **exactly why**:

### Step 1: Open Browser DevTools
1. Press **F12** (or right-click → Inspect)
2. Go to the **Network** tab
3. **Keep DevTools open** while you try to sign up

### Step 2: Try Signing Up
1. Fill out the signup form
2. Click "Sign Up"
3. The 422 error will appear in the Network tab

### Step 3: Find the Failed Request
1. In the Network tab, look for a request to:
   - `sign_ups` or
   - `resolved-oarfish-2.clerk.accounts.dev/v1/client/sign_ups`
2. It will show **422** in red
3. **Click on it** to see details

### Step 4: Read the Error Response
1. With the request selected, go to the **Response** tab (or **Preview** tab)
2. You'll see a JSON response like this:

```json
{
  "errors": [
    {
      "code": "form_identifier_not_found",
      "message": "Email address is required",
      "meta": {
        "param_name": "email_address"
      }
    }
  ]
}
```

OR

```json
{
  "errors": [
    {
      "code": "form_password_pwned",
      "message": "Password has been found in a data breach"
    }
  ]
}
```

OR

```json
{
  "errors": [
    {
      "code": "form_identifier_exists",
      "message": "Email address is already taken"
    }
  ]
}
```

### Step 5: Fix Based on the Error

| Error Code | Meaning | Fix |
|-----------|---------|-----|
| `form_identifier_exists` | Email already exists | Use a different email |
| `form_password_pwned` | Password found in breach | Use a stronger password |
| `form_password_length_too_short` | Password too short | Make password longer |
| `form_identifier_not_found` | Email field missing | Check form is filled |
| `captcha_invalid` | Bot protection failed | Disable bot protection in Clerk Dashboard |
| `form_identifier_invalid` | Invalid email format | Check email format |
| `restriction_failed` | Email domain blocked | Remove restrictions in Clerk Dashboard |

---

## 🎯 Most Common Fixes

### Fix 1: Disable Bot Protection (Most Common)
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. **User & Authentication** → **Attack Protection**
3. Turn OFF:
   - ❌ "Enable bot sign-up protection"
   - ❌ "Enable bot sign-in protection"
4. Save

### Fix 2: Remove Email Restrictions
1. Clerk Dashboard → **User & Authentication** → **Restrictions**
2. Remove all entries from **Allowlist** and **Blocklist**
3. Save

### Fix 3: Check Email is Enabled
1. Clerk Dashboard → **User & Authentication** → **Email, Phone, Username**
2. Ensure **Email address** is:
   - ✅ Toggle ON
   - ✅ "Use as login identifier" checked
   - ✅ "Require" checked

### Fix 4: Use a Different Email
- Try a completely new email address
- Use a simple email like `test@gmail.com`
- Make sure you haven't used it before

### Fix 5: Use a Stronger Password
- At least 8 characters
- Mix of letters, numbers, and symbols
- Not found in data breaches (avoid common passwords)

---

## 📸 Screenshot Guide

### What to Look For in Network Tab:

```
Network Tab
├── sign_ups (422) ← Click this one!
    ├── Headers tab
    ├── Payload tab (what you sent)
    └── Response tab ← READ THIS! (the error message)
```

### Example Response Tab Content:

```json
{
  "status": 422,
  "errors": [
    {
      "code": "captcha_invalid",
      "message": "CAPTCHA verification failed",
      "long_message": "The CAPTCHA challenge was not completed successfully"
    }
  ]
}
```

This tells you: **CAPTCHA failed** → Solution: Disable bot protection

---

## 🚨 Quick Action Items

1. **Open DevTools (F12) → Network tab**
2. **Try signing up**
3. **Click on the failed `sign_ups` request**
4. **Read the Response tab** - this tells you exactly why it failed
5. **Fix based on the error code** (see table above)

---

## 💡 Pro Tip

After you see the error message, you can:
1. Copy the error code
2. Search for it in Clerk documentation
3. Or follow the fixes above based on the error code

**The Response tab in Network DevTools is your best friend for debugging 422 errors!**

