# 🎉 Clerk.com Integration - Complete Setup Guide

## ✅ What Has Been Implemented

### Backend Implementation
- ✅ Clerk packages installed (`@clerk/backend`, `@clerk/express`, `svix`)
- ✅ Clerk authentication middleware (`backend/src/middleware/clerkAuth.js`)
- ✅ Clerk webhook endpoint for user synchronization (`backend/src/routes/clerk.js`)
- ✅ Database user sync on Clerk events (user.created, user.updated, email.verified)
- ✅ Environment configuration templates updated

### Frontend Implementation
- ✅ Clerk React package installed (`@clerk/clerk-react`)
- ✅ ClerkProvider integrated in App.tsx
- ✅ Clerk sign-in page (`frontend/src/pages/ClerkSignIn.tsx`)
- ✅ Clerk sign-up page (`frontend/src/pages/ClerkSignUp.tsx`)
- ✅ Clerk API helper utilities (`frontend/src/lib/clerkApi.ts`)
- ✅ ClerkAuthContext for Clerk-based authentication (`frontend/src/contexts/ClerkAuthContext.tsx`)

---

## 🚀 Step-by-Step Setup Instructions

### Step 1: Create Your Clerk Account

1. Go to **[clerk.com](https://clerk.com)**
2. Click "Get Started" and create a free account
3. Create a new application
   - Application name: **RPC Loan Hub**
   - Select authentication methods: **Email** and **Password**

### Step 2: Configure Clerk Dashboard

#### Enable Email Verification:
1. In Clerk Dashboard, go to **User & Authentication** → **Email, Phone, Username**
2. Enable **Email address**
3. Check **"Verify at sign-up"** to require email verification
4. Save changes

#### Configure Email Settings:
1. Go to **Customization** → **Email**
2. Customize verification email template (optional)
3. You can use Clerk's default email service or configure your own SMTP

### Step 3: Get Your Clerk API Keys

1. In Clerk Dashboard, go to **API Keys**
2. Copy the following keys:

**Publishable Key** (starts with `pk_test_...`)
- Used in frontend
- Safe to expose in client code

**Secret Key** (starts with `sk_test_...`)
- Used in backend
- KEEP THIS SECRET!

### Step 4: Set Up Environment Variables

#### Backend (.env):
Create or update `backend/.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://your_connection_string

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
CLERK_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Stripe
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SECRET

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
ALLOW_ALL_ORIGINS=true
```

#### Frontend (.env):
Create or update `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE

VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_KEY
```

### Step 5: Configure Clerk Webhooks

Webhooks allow Clerk to notify your backend when user events occur (sign up, email verified, etc.)

#### For Local Development:
1. Install [Clerk CLI](https://clerk.com/docs/quickstarts/setup-clerk) or use a tunnel like [ngrok](https://ngrok.com/)
2. If using ngrok: `ngrok http 3001`
3. Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)

#### Configure Webhook in Clerk Dashboard:
1. Go to **Webhooks** in Clerk Dashboard
2. Click **"Add Endpoint"**
3. Enter your webhook URL:
   - Local (with ngrok): `https://abc123.ngrok.io/api/clerk/webhook`
   - Production: `https://your-domain.com/api/clerk/webhook`
4. Select the following events:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
   - ✅ `email.created`
   - ✅ `email.updated`
5. Click **"Create"**
6. Copy the **Signing Secret** (starts with `whsec_...`)
7. Add it to `backend/.env` as `CLERK_WEBHOOK_SECRET`

### Step 6: Install Dependencies

If packages aren't installed yet:

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### Step 7: Update Database (Optional)

If you need to ensure the users table supports Clerk:

```bash
cd backend
node src/db/migrate.js
```

The users table should have these columns:
- `id` (text/varchar) - Clerk user ID
- `email` (text)
- `full_name` (text)
- `phone` (text)
- `role` (text)
- `email_verified` (boolean)
- `is_active` (boolean)

### Step 8: Start Your Application

#### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

#### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### Step 9: Test Clerk Authentication

1. Open your browser to `http://localhost:5173`
2. Navigate to **Clerk Sign Up**: `http://localhost:5173/clerk-signup`
3. Create a new account with your email
4. Check your email for verification link
5. Click verification link
6. Sign in at: `http://localhost:5173/clerk-signin`

---

## 🔄 Migration Strategy: Legacy Auth → Clerk

You have two options:

### Option A: Dual Authentication (Recommended for Transition)
Keep both authentication systems running:
- **Legacy routes**: `/login`, `/register` (existing users)
- **Clerk routes**: `/clerk-signin`, `/clerk-signup` (new users)
- Gradually migrate users to Clerk

### Option B: Full Clerk Migration
1. Update Landing page to use Clerk sign-in/sign-up
2. Remove legacy auth routes
3. Migrate existing users:
   ```javascript
   // Backend migration script to create Clerk users from existing users
   // Contact me if you need this script
   ```

---

## 🎨 Customization

### Customize Clerk UI Theme

Update the `appearance` prop in `ClerkSignIn.tsx` and `ClerkSignUp.tsx`:

```tsx
appearance={{
  elements: {
    formButtonPrimary: "bg-gold-500 hover:bg-gold-600 text-navy-900",
    card: "bg-white shadow-xl",
    // Add more customizations
  },
}}
```

### Add Social Sign-In (Google, GitHub, etc.)

1. In Clerk Dashboard → **User & Authentication** → **Social Connections**
2. Enable desired providers (Google, GitHub, Microsoft, etc.)
3. Social buttons will automatically appear in sign-in/sign-up components

---

## 🛡️ Security Features

Clerk provides out-of-the-box:
- ✅ **Email verification** - Automatic verification flows
- ✅ **Password security** - Strong password requirements
- ✅ **Session management** - Secure JWT tokens
- ✅ **Brute force protection** - Rate limiting
- ✅ **Account takeover protection** - Suspicious activity detection
- ✅ **2FA support** - Optional two-factor authentication

---

## 📊 User Management

### View Users:
1. Clerk Dashboard → **Users**
2. See all registered users
3. Manually verify emails, ban users, etc.

### User Roles:
Roles are synced to your database via webhooks. Update roles in your database:

```sql
UPDATE users SET role = 'operations' WHERE email = 'user@example.com';
```

---

## 🐛 Troubleshooting

### Issue: "Clerk publishable key not found"
**Solution**: Make sure `VITE_CLERK_PUBLISHABLE_KEY` is set in `frontend/.env`

### Issue: Webhook verification failed
**Solution**: 
1. Check `CLERK_WEBHOOK_SECRET` is correctly set in `backend/.env`
2. Make sure you're using the signing secret from the webhook endpoint in Clerk Dashboard

### Issue: User not syncing to database
**Solution**:
1. Check backend logs for webhook errors
2. Verify webhook endpoint is reachable (use ngrok for local dev)
3. Check database connection

### Issue: CORS errors
**Solution**: Make sure `FRONTEND_URL` in `backend/.env` matches your frontend URL

---

## 📚 Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk React SDK](https://clerk.com/docs/references/react/overview)
- [Clerk Node.js SDK](https://clerk.com/docs/references/nodejs/overview)
- [Webhooks Guide](https://clerk.com/docs/users/sync-data)

---

## 🎯 Next Steps

1. ✅ Complete Steps 1-9 above
2. Test sign-up and sign-in flows
3. Verify email verification is working
4. Test webhook synchronization
5. Customize UI to match your branding
6. Add social sign-in (optional)
7. Configure production webhook URL before deployment

---

## 💡 Using Clerk API in Your Components

### Example: Making authenticated API calls with Clerk

```tsx
import { useClerkApi } from '@/lib/clerkApi';

function MyComponent() {
  const { clerkApiRequest } = useClerkApi();

  const fetchLoans = async () => {
    try {
      const data = await clerkApiRequest('/loans', { method: 'GET' });
      console.log('Loans:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return <button onClick={fetchLoans}>Fetch Loans</button>;
}
```

---

## ✅ Checklist

- [ ] Created Clerk account
- [ ] Configured email verification in Clerk Dashboard
- [ ] Copied API keys (Publishable & Secret)
- [ ] Updated `backend/.env` with Clerk keys
- [ ] Updated `frontend/.env` with Clerk key
- [ ] Configured webhook endpoint in Clerk Dashboard
- [ ] Added webhook signing secret to `backend/.env`
- [ ] Installed dependencies (`npm install`)
- [ ] Started backend server
- [ ] Started frontend server
- [ ] Tested sign-up flow
- [ ] Verified email verification works
- [ ] Tested sign-in flow
- [ ] Confirmed user sync to database

---

**Need help?** Check the troubleshooting section or refer to the Clerk documentation!

🎉 **Congratulations! Your Clerk integration is complete!**
