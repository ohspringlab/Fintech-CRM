# Security Guidelines

## 🔒 Important Security Notes

### Before Pushing to GitHub

1. **Never commit sensitive files:**
   - `.env` files
   - Database credentials
   - API keys
   - JWT secrets
   - Private keys

2. **Default Credentials:**
   - The default admin credentials (`admin@rpc-lending.com` / `admin123456`) are for **DEVELOPMENT ONLY**
   - **MUST be changed in production**
   - Use environment variables to set custom credentials

3. **Environment Variables:**
   - Copy `.env.example` to `.env` and fill in your values
   - Never commit `.env` files
   - Use different credentials for production

### Production Deployment Checklist

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables
- [ ] Use strong database passwords
- [ ] Enable HTTPS
- [ ] Configure CORS properly (remove `ALLOW_ALL_ORIGINS=true`)
- [ ] Set `NODE_ENV=production`
- [ ] Review and restrict file upload sizes
- [ ] Enable rate limiting
- [ ] Set up proper logging and monitoring
- [ ] Regular security updates for dependencies

### Environment Variables

Required environment variables are documented in:
- `backend/.env.example`
- `frontend/.env.example`

### Reporting Security Issues

If you discover a security vulnerability, please email security@rpc-lending.com instead of opening a public issue.


