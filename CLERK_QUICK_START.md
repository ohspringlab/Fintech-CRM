# 🚀 Quick Start: Clerk Integration (No Webhooks)

## 📋 What You Need

1. **Clerk Account**: Sign up at [clerk.com](https://clerk.com)
2. **API Keys** from Clerk Dashboard:
   - Publishable Key: `pk_test_...`
   - Secret Key: `sk_test_...`

---

## ⚡ 3-Minute Setup

### 1. Add Keys to Environment Files

**backend/.env**:
```env
CLERK_SECRET_KEY=sk_test_YOUR_KEY
CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY
```

**frontend/.env**:
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY
```

### 2. Install Dependencies (if not done)
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Start Servers
```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

### 4. Test It
- Sign up: `http://localhost:5173/clerk-signup`
- Sign in: `http://localhost:5173/clerk-signin`

---

## 🔗 Important URLs

| Purpose | URL |
|---------|-----|
| Clerk Dashboard | https://dashboard.clerk.com |
| Sign Up Page | http://localhost:5173/clerk-signup |
| Sign In Page | http://localhost:5173/clerk-signin |
| API Health | http://localhost:3001/api/health |

---

## 🎯 Key Features Enabled

✅ Email/Password authentication  
✅ Automatic email verification  
✅ Session management  
✅ User sync to database (on authentication)  
✅ Secure JWT tokens  
✅ Password reset flows  
✅ User profile management  

**Note**: Users are automatically synced to your database when they sign in. No webhook setup needed!  

---

## 📱 Routes Available

| Route | Purpose |
|-------|---------|
| `/clerk-signup` | Clerk sign-up page |
| `/clerk-signin` | Clerk sign-in page |
| `/login` | Legacy login (still works) |
| `/register` | Legacy register (still works) |
| `/dashboard` | User dashboard (requires auth) |

---

## 🛠️ Using Clerk in Components

```tsx
import { useClerkApi } from '@/lib/clerkApi';
import { useUser } from '@clerk/clerk-react';

function MyComponent() {
  const { user, isLoaded } = useUser();
  const { clerkApiRequest } = useClerkApi();

  const fetchData = async () => {
    const data = await clerkApiRequest('/loans');
  };

  if (!isLoaded) return <div>Loading...</div>;
  
  return <div>Welcome {user?.firstName}!</div>;
}
```

---

## � Full Documentation

See `CLERK_IMPLEMENTATION_COMPLETE.md` for detailed information.

---

**Ready to go!** 🎉 No webhook configuration needed - users sync automatically when they sign in!
