# Clerk Environment Variables Setup

## ⚠️ Important: Your Keys

I've received your Clerk keys. Here's how to set them up:

**Backend Secret Key:**
```
sk_test_mX6XMcpEEE7SbYot0fHqJYbZY8G1YYXrknp9H31hsf
```

**Frontend Publishable Key:**
```
pk_test_dm9jYWwtamVubmV0LTEuY2xlcmsuYWNjb3VudHMuZGV2JA
```

**Note:** The publishable key appears to be incomplete (ends with `$`). Please verify the complete key from your Clerk dashboard.

## 📝 Setup Instructions

### Step 1: Create Backend .env File

Create `backend/.env` file with:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rpc_loan_hub

# Clerk Authentication
CLERK_SECRET_KEY=sk_test_mX6XMcpEEE7SbYot0fHqJYbZY8G1YYXrknp9H31hsf
CLERK_PUBLISHABLE_KEY=pk_test_dm9jYWwtamVubmV0LTEuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# JWT (if still using custom auth)
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# Application
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:8080
ALLOW_ALL_ORIGINS=true

# Admin
ADMIN_EMAIL=admin@rpc-lending.com
ADMIN_PASSWORD=your-secure-password
```

### Step 2: Create Frontend .env File

Create `frontend/.env` file with:

```env
# API Configuration
VITE_API_URL=http://localhost:3001/api

# Clerk Authentication
# IMPORTANT: Use VITE_ prefix for Vite (not NEXT_PUBLIC_)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_dm9jYWwtamVubmV0LTEuY2xlcmsuYWNjb3VudHMuZGV2JA
```

**⚠️ Important:** 
- For Vite projects, use `VITE_CLERK_PUBLISHABLE_KEY` (not `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`)
- The `NEXT_PUBLIC_` prefix is only for Next.js projects

### Step 3: Get Webhook Secret

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Webhooks**
3. Create a new webhook endpoint:
   - URL: `http://localhost:3001/api/clerk/webhook`
   - Events: Select `user.created`, `user.updated`, `user.deleted`, `email.created`, `email.updated`
4. Copy the **Signing Secret** (starts with `whsec_`)
5. Add it to `backend/.env` as `CLERK_WEBHOOK_SECRET`

### Step 4: Verify Publishable Key

Please verify your complete publishable key from Clerk Dashboard → API Keys. The key you provided seems to end with `$` which might be incomplete.

## 🔒 Security Notes

✅ `.env` files are already in `.gitignore` - they won't be committed
✅ Never commit `.env` files to Git
✅ Use `.env.example` files as templates (without real keys)

## 🚀 Next Steps

1. ✅ Create `backend/.env` with your keys
2. ✅ Create `frontend/.env` with your publishable key
3. ✅ Get webhook secret from Clerk dashboard
4. ✅ Verify publishable key is complete
5. ✅ Restart your development servers

## 📋 Quick Copy-Paste

**Backend .env:**
```bash
cd backend
cat > .env << 'EOF'
DATABASE_URL=postgresql://user:password@localhost:5432/rpc_loan_hub
CLERK_SECRET_KEY=sk_test_mX6XMcpEEE7SbYot0fHqJYbZY8G1YYXrknp9H31hsf
CLERK_PUBLISHABLE_KEY=pk_test_dm9jYWwtamVubmV0LTEuY2xlcmsuYWNjb3VudHMuZGV2JA
CLERK_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:8080
ALLOW_ALL_ORIGINS=true
EOF
```

**Frontend .env:**
```bash
cd frontend
cat > .env << 'EOF'
VITE_API_URL=http://localhost:3001/api
VITE_CLERK_PUBLISHABLE_KEY=pk_test_dm9jYWwtamVubmV0LTEuY2xlcmsuYWNjb3VudHMuZGV2JA
EOF
```

## ✅ Verification

After setting up, test that keys are loaded:

**Backend:**
```bash
cd backend
node -e "require('dotenv').config(); console.log('Secret Key:', process.env.CLERK_SECRET_KEY ? '✅ Set' : '❌ Missing');"
```

**Frontend:**
The key will be available at runtime via `import.meta.env.VITE_CLERK_PUBLISHABLE_KEY`

---

**Your keys are configured!** Now you can proceed with the Clerk integration setup.

