# Vercel Deployment Checklist

Use this checklist to ensure a smooth deployment.

## Pre-Deployment

- [ ] Code committed and pushed to Git repository
- [ ] `api/index.js` created
- [ ] `vercel.json` created
- [ ] `.gitignore` updated (includes `.vercel`)
- [ ] Database provider chosen (Supabase/Vercel Postgres/Neon)
- [ ] Database connection string ready

## Deployment Steps

- [ ] Repository imported to Vercel
- [ ] First deployment completed (may fail - that's OK)
- [ ] Environment variables added:
  - [ ] `DATABASE_URL`
  - [ ] `JWT_SECRET` (32+ characters)
  - [ ] `JWT_EXPIRES_IN` (7d)
  - [ ] `FRONTEND_URL` (will update after deployment)
  - [ ] `ALLOW_ALL_ORIGINS` (false)
  - [ ] `ADMIN_EMAIL`
  - [ ] `ADMIN_PASSWORD`
  - [ ] `NODE_ENV` (production)
  - [ ] `VITE_API_URL` (will update after deployment)
- [ ] Redeployed with environment variables
- [ ] Database migrations run successfully
- [ ] Admin account created

## File Storage Setup

- [ ] Cloud storage provider chosen (Vercel Blob/Supabase Storage)
- [ ] Storage token/credentials obtained
- [ ] `BLOB_READ_WRITE_TOKEN` added to environment variables (if using Vercel Blob)
- [ ] `backend/src/routes/documents.js` updated to use cloud storage
- [ ] File upload tested and working

## Post-Deployment

- [ ] Health endpoint working: `/api/health`
- [ ] Frontend loads: `https://your-project.vercel.app`
- [ ] `FRONTEND_URL` updated with actual Vercel URL
- [ ] `VITE_API_URL` updated with actual Vercel URL + `/api`
- [ ] Authentication tested (login/register)
- [ ] File upload tested (if configured)
- [ ] CORS working correctly
- [ ] No console errors in browser
- [ ] No errors in Vercel function logs

## Optional Setup

- [ ] Custom domain configured
- [ ] Email service configured (if using)
- [ ] Stripe configured (if using payments)
- [ ] Monitoring/alerts set up

## Cost Summary

- [ ] Verified all services are on free tier:
  - [ ] Vercel hosting: Free
  - [ ] Database: Free tier (Supabase/Neon)
  - [ ] File storage: Free tier (Vercel Blob/Supabase)
  - [ ] Total cost: **$0/month** ✅

## Notes

- HubSpot API: **Not required** - can skip
- Stripe: **Not required** - can skip
- All core features work without paid services

