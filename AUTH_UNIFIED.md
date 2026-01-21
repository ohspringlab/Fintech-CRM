# 🔐 Unified Authentication System

## How It Works Now

Your application now uses **Clerk as the single authentication provider** with your **Neon PostgreSQL database** for application data storage.

## Architecture

```
┌─────────────────────┐
│   User Signs Up     │
│   (Clerk UI)        │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│   Clerk.com         │  ← Manages authentication
│                     │  ← Stores passwords securely
│   - User accounts   │  ← Handles email verification
│   - Passwords       │  ← Issues JWT tokens
│   - Sessions        │
└──────────┬──────────┘
           │
           │ User logs in
           ↓
┌─────────────────────┐
│   Your Backend      │
│   (Node.js API)     │
│                     │
│   - Verifies JWT    │
│   - Syncs user      │ ──────────┐
└──────────┬──────────┘            │
           │                       │
           │ Stores user data      │
           ↓                       ↓
┌─────────────────────┐   ┌──────────────┐
│  Neon PostgreSQL    │   │ Application  │
│                     │   │    Data      │
│  - User profiles    │   │              │
│  - Roles            │   │ - Loans      │
│  - Application data │   │ - Documents  │
└─────────────────────┘   │ - Payments   │
                          └──────────────┘
```

## What Happens When a User Signs Up

1. **User visits**: `/register` or `/clerk-signup`
2. **Clerk handles**: 
   - Account creation
   - Password validation
   - Email verification
   - Session creation
3. **User signs in**: After email verification
4. **Your backend**:
   - Verifies JWT token from Clerk
   - Checks if user exists in Neon database
   - If new: Creates user record with role='borrower'
   - If existing: Updates user data from Clerk
   - Attaches user to request
5. **User can access**: Protected routes in your app

## Database Separation

### Clerk Database (Managed by Clerk)
✅ User credentials (email, password)  
✅ Authentication sessions  
✅ Email verification status  
✅ Social login connections  
✅ Security & MFA settings  

### Your Neon Database (Managed by You)
✅ User profile data (synced from Clerk)  
✅ User roles (borrower, operations, admin)  
✅ Loans and applications  
✅ Documents and uploads  
✅ Payments and transactions  
✅ All business logic data  

## Routes Updated

### Legacy Routes (Auto-redirect to Clerk)
- `/login` → redirects to `/clerk-signin`
- `/register` → redirects to `/clerk-signup`
- `/verify-email` → redirects to `/clerk-signup`

### Active Routes
- `/clerk-signin` - Clerk sign-in UI
- `/clerk-signup` - Clerk sign-up UI
- `/dashboard` - Protected user dashboard
- All other application routes

## Authentication Flow

### Sign Up
```
1. User → /clerk-signup
2. Enters email & password
3. Clerk sends verification email
4. User clicks link or enters code
5. Account verified
6. User signs in
7. Backend creates user in Neon DB
8. Redirected to /dashboard
```

### Sign In
```
1. User → /clerk-signin
2. Enters credentials
3. Clerk verifies password
4. Issues JWT token
5. Backend verifies JWT
6. Backend syncs/updates user in Neon DB
7. User authenticated
8. Redirected to /dashboard
```

## User Data Sync

Every time a user authenticates, the backend:

1. **Verifies** the Clerk JWT token
2. **Fetches** user data from Clerk
3. **Checks** if user exists in Neon DB (by Clerk user ID)
4. **Creates** new user if first time: `role='borrower'`
5. **Updates** existing user with latest Clerk data
6. **Ensures** role is never 'admin' by default

This happens in `backend/src/middleware/clerkAuth.js`

## Why This Is Better

### Before (Two Separate Systems)
❌ Passwords stored in your database  
❌ Email verification self-managed  
❌ Session management complex  
❌ Security vulnerabilities  
❌ Users couldn't log in across systems  

### Now (Clerk + Neon)
✅ Passwords managed by Clerk (more secure)  
✅ Email verification automatic  
✅ Sessions managed by Clerk  
✅ Better security out-of-the-box  
✅ Single sign-on experience  
✅ Your database only stores application data  

## Managing Users

### View Users
- **Clerk Dashboard**: See all users, authentication status
- **Your Database**: Query user profiles and roles

### Change User Roles
```sql
-- Make a user operations
UPDATE users SET role = 'operations' WHERE email = 'user@example.com';

-- Make a user admin
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

### User Roles
- **borrower** (default) - Regular users
- **operations** - Can manage loans and applications
- **admin** - Full access to everything

## Environment Variables

Your authentication requires these keys:

**Backend (.env)**:
```env
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
DATABASE_URL=postgresql://...
```

**Frontend (.env)**:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

## No More Password Issues!

✅ Users sign up with Clerk  
✅ Clerk manages passwords  
✅ User data syncs to your database automatically  
✅ One account = Works everywhere  
✅ Same credentials for both systems  

## Testing

1. Sign up at `/clerk-signup`
2. Verify your email
3. Sign in at `/clerk-signin`
4. Access `/dashboard`
5. Check your Neon database - user should be there with role='borrower'

---

**Your authentication is now unified and working!** 🎉
