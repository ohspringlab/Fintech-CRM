# Clerk Integration Guide - Email Verification

This guide explains how to integrate Clerk for authentication and email verification in your RPC Loan Hub application.

## 📋 Overview

Clerk provides:
- ✅ User authentication (sign up, sign in)
- ✅ Email verification (automatic)
- ✅ Password management
- ✅ Session management
- ✅ Social logins (optional)
- ✅ User management dashboard

## 🚀 Setup Steps

### Step 1: Create Clerk Account

1. Go to [clerk.com](https://clerk.com)
2. Sign up for a free account
3. Create a new application
4. Choose authentication methods (Email/Password recommended)
5. Enable email verification in settings

### Step 2: Get Clerk Keys

From Clerk Dashboard → API Keys:

1. **Publishable Key** (starts with `pk_`)
   - Used in frontend
   - Safe to expose in client code

2. **Secret Key** (starts with `sk_`)
   - Used in backend
   - Keep secret!

3. **Webhook Secret** (for webhooks)
   - Get from Webhooks section
   - Used to verify webhook requests

### Step 3: Install Packages

**Backend:**
```bash
cd backend
npm install @clerk/backend @clerk/express svix
```

**Frontend:**
```bash
cd frontend
npm install @clerk/clerk-react
```

### Step 4: Set Environment Variables

**Backend (.env):**
```env
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

**Frontend (.env):**
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

**For Vercel Deployment:**
Add these to Vercel environment variables:
- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `CLERK_WEBHOOK_SECRET`
- `VITE_CLERK_PUBLISHABLE_KEY`

### Step 5: Configure Clerk Webhook

1. Go to Clerk Dashboard → Webhooks
2. Click "Add Endpoint"
3. Enter your webhook URL:
   - Development: `http://localhost:3001/api/clerk/webhook`
   - Production: `https://your-domain.com/api/clerk/webhook`
4. Select events to listen to:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
   - ✅ `email.created`
   - ✅ `email.updated`
5. Copy the webhook signing secret to `CLERK_WEBHOOK_SECRET`

### Step 6: Update Frontend to Use Clerk

Replace the current `AuthProvider` with `ClerkAuthProvider` in `App.tsx`:

```tsx
// In App.tsx, replace:
import { AuthProvider } from "./contexts/AuthContext";

// With:
import { ClerkAuthProvider } from "./contexts/ClerkAuthContext";
```

Then update the App component:
```tsx
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ClerkAuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </ClerkAuthProvider>
  </QueryClientProvider>
);
```

### Step 7: Update Login/Register Pages

Replace custom forms with Clerk components:

**Option A: Use Clerk's Pre-built Components (Recommended)**

```tsx
import { SignIn, SignUp } from '@clerk/clerk-react';

// In Login.tsx
export default function Login() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn routing="path" path="/login" />
    </div>
  );
}

// In Register.tsx
export default function Register() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp routing="path" path="/register" />
    </div>
  );
}
```

**Option B: Use Custom Forms with Clerk Hooks**

See Clerk documentation for custom form implementation.

### Step 8: Update Protected Routes

Use Clerk's built-in components:

```tsx
import { ClerkProtectedRoute } from "./contexts/ClerkAuthContext";

// Replace ProtectedRoute with:
<Route path="/dashboard" element={
  <ClerkProtectedRoute>
    <BorrowerDashboard />
  </ClerkProtectedRoute>
} />
```

### Step 9: Update Backend Routes

Replace JWT authentication with Clerk authentication:

**Before:**
```javascript
const { authenticate } = require('../middleware/auth');
router.get('/', authenticate, async (req, res) => {
  // ...
});
```

**After:**
```javascript
const { requireClerkAuth } = require('../middleware/clerkAuth');
router.get('/', requireClerkAuth, async (req, res) => {
  // req.user is populated from Clerk
  // ...
});
```

### Step 10: Test Email Verification

1. Register a new user via Clerk
2. Check email for verification link
3. Click verification link
4. User should be automatically verified
5. Check database - `email_verified` should be `true`

## 🔄 Migration Strategy

### Option 1: Gradual Migration (Recommended)

1. Keep both auth systems running
2. Add Clerk alongside existing auth
3. Migrate routes one by one
4. Test thoroughly
5. Remove old auth system once stable

### Option 2: Full Replacement

1. Set up Clerk completely
2. Replace all auth routes
3. Update all frontend components
4. Test everything
5. Deploy

## 📝 Key Changes Made

### Backend Changes

1. **New Middleware**: `backend/src/middleware/clerkAuth.js`
   - `requireClerkAuth` - Verify Clerk session
   - `requireClerkOps` - Check operations role
   - `requireClerkAdmin` - Check admin role

2. **New Routes**: `backend/src/routes/clerk.js`
   - Webhook endpoint for user sync
   - User info endpoint

3. **Updated Server**: `backend/src/server.js`
   - Added Clerk routes

### Frontend Changes

1. **New Context**: `frontend/src/contexts/ClerkAuthContext.tsx`
   - Clerk-based authentication
   - Email verification status
   - Protected route component

2. **Updated App**: `frontend/src/App.tsx`
   - Use `ClerkAuthProvider` instead of `AuthProvider`

## 🔐 Email Verification Flow

1. User signs up via Clerk
2. Clerk sends verification email automatically
3. User clicks verification link
4. Clerk verifies email
5. Webhook fires `email.updated` event
6. Backend updates `email_verified` in database
7. Frontend shows verified status

## ✅ Benefits of Clerk

- **Automatic Email Verification**: No custom implementation needed
- **Secure**: Industry-standard security practices
- **Scalable**: Handles millions of users
- **Features**: Password reset, 2FA, social logins
- **Dashboard**: User management UI included
- **Free Tier**: 10,000 MAU (Monthly Active Users)

## 🐛 Troubleshooting

### Webhook Not Working
- Check `CLERK_WEBHOOK_SECRET` is set correctly
- Verify webhook URL is accessible
- Check webhook logs in Clerk dashboard
- Ensure `svix` package is installed

### Email Verification Not Updating
- Check webhook is receiving events
- Verify database update query
- Check Clerk dashboard for email status
- Review webhook logs

### Authentication Failing
- Verify `CLERK_SECRET_KEY` is set
- Check `CLERK_PUBLISHABLE_KEY` in frontend
- Ensure Clerk middleware is applied
- Review error logs

## 📚 Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk React SDK](https://clerk.com/docs/references/react/overview)
- [Clerk Express SDK](https://clerk.com/docs/backend-requests/overview/express)
- [Clerk Webhooks](https://clerk.com/docs/integrations/webhooks/overview)

## 🎯 Next Steps

1. ✅ Install packages
2. ✅ Set environment variables
3. ✅ Configure webhook
4. ✅ Update frontend
5. ✅ Update backend routes
6. ✅ Test email verification
7. ✅ Deploy

---

**Note**: You can keep the existing auth system as a fallback during migration, or replace it entirely based on your needs.

