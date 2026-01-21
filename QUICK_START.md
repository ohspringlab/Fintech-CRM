# Quick Start - Push to GitHub

## 🚀 Quick Commands (Copy & Paste)

### 1. Check Current Status
```bash
git status
```

### 2. Add All Files
```bash
git add .
```

### 3. Commit Changes
```bash
git commit -m "Initial commit: RPC Loan Hub - Loan Management System"
```

### 4. Create GitHub Repository
- Go to: https://github.com/new
- Name: `rpc-loan-hub`
- Click "Create repository"

### 5. Connect to GitHub (Replace YOUR_USERNAME)
```bash
git remote add origin https://github.com/YOUR_USERNAME/rpc-loan-hub.git
```

### 6. Push to GitHub
```bash
git push -u origin main
```

**Note:** You'll need a Personal Access Token as password:
- GitHub → Settings → Developer settings → Personal access tokens → Generate new token
- Select `repo` scope
- Use token as password when pushing

---

## 📋 Full Guide

For detailed step-by-step instructions, see: **[GITHUB_SETUP_GUIDE.md](./GITHUB_SETUP_GUIDE.md)**

---

## ✅ Pre-Push Checklist

- [ ] `.env` files exist locally but are NOT in git
- [ ] `node_modules/` is NOT in git
- [ ] All source code is ready
- [ ] README.md is complete
- [ ] No passwords/keys in code

---

## 🔍 Verify Before Pushing

```bash
# Check what will be committed
git status

# Make sure .env is NOT listed
# If .env shows up, check .gitignore
```

---

## 🆘 Common Issues

**"remote origin already exists"**
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/rpc-loan-hub.git
```

**"Authentication failed"**
- Use Personal Access Token (not password)
- Or use SSH instead of HTTPS

**".env files showing"**
```bash
git rm --cached backend/.env frontend/.env
git add .gitignore
git commit -m "Remove .env files"
```


