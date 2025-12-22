# Pre-Deployment Checklist

Complete this checklist before deploying to Vercel to ensure a smooth deployment.

## ✅ Code Quality Checks

### TypeScript Compilation
- [x] All nullable `user_id` fields handled correctly
- [x] Admin dashboard filters public messages
- [x] Messages viewer skips null user_id
- [x] TypeScript strict mode enabled in tsconfig.json

### Code Issues Fixed
- [x] JSON response parsing (handles "text", "response", and structured JSON)
- [x] Duration calculation fixed (uses last_activity_at)
- [x] Mobile responsive design implemented
- [x] All CORS headers configured in vercel.json

## 🗄️ Database Setup

### Supabase Tables Required
- [ ] `profiles` table created
- [ ] `assistants` table created with `public_link_token` column
- [ ] `user_assistant` table created
- [ ] `conversations` table created
- [ ] `messages` table created with nullable `user_id`
- [ ] `public_sessions` table created with `master_link_token`

### Database Migrations to Run
Run these SQL files in your Supabase SQL Editor:

1. [ ] Run `public-chat-migration.sql` - Creates public_sessions table
2. [ ] Run `public-chat-migration-update.sql` - Adds permanent link support

### Row Level Security (RLS) Policies
Ensure these are configured in Supabase:

- [ ] Public sessions accessible via session_token
- [ ] Public messages readable by session
- [ ] Admin-only access to user management
- [ ] User can only access their own conversations

## 🔐 Environment Variables

### Required on Vercel
Set these in: Vercel Dashboard → Settings → Environment Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` - From Supabase Project Settings → API
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - From Supabase Project Settings → API
- [ ] `OPENAI_API_KEY` - From platform.openai.com → API Keys

### Optional Variables
- [ ] `NEXT_PUBLIC_APP_URL` - Your Vercel deployment URL

## 🧪 Local Testing

Before deploying, test these features locally:

### Authentication Flow
- [ ] User can sign up
- [ ] User can log in
- [ ] User can log out
- [ ] Password reset works (if implemented)

### Admin Panel
- [ ] Admin can log in
- [ ] Dashboard shows correct statistics
- [ ] Can create/edit/delete assistants
- [ ] Can assign assistants to users
- [ ] Can view user messages
- [ ] Can view public sessions
- [ ] Can delete public sessions
- [ ] Can export data (CSV/JSON)
- [ ] Filters work correctly
- [ ] Pagination works correctly

### Chat Functionality
- [ ] User can create new conversation
- [ ] Messages send and receive correctly
- [ ] Streaming responses work
- [ ] JSON responses parsed correctly
- [ ] Message history loads
- [ ] Different assistants show different personalities

### Public Chat Feature
- [ ] Can generate public chat link
- [ ] Link opens chat interface
- [ ] Multiple visitors create separate sessions
- [ ] Messages save correctly
- [ ] Session ends on browser close
- [ ] Admin can view public sessions
- [ ] Each session has unique ID
- [ ] Duration displays correctly

### Mobile Responsiveness
- [ ] Chat interface works on mobile
- [ ] Admin panel readable on mobile
- [ ] Public chat works on mobile
- [ ] All buttons clickable on mobile
- [ ] Text is readable (not too small)

## 📦 Build Test

Test the production build locally:

```bash
npm run build
npm start
```

### Build Should Complete Successfully
- [ ] No TypeScript errors
- [ ] No build warnings (check for critical ones)
- [ ] Static pages generated
- [ ] All routes accessible

### Common Build Errors to Check
- [ ] `user_id` type errors → Should be fixed
- [ ] Missing environment variables → Use .env.local
- [ ] Import errors → Check all imports
- [ ] ESLint errors → Fix or disable specific rules

## 🚀 Vercel Deployment

### Repository Setup
- [ ] Code pushed to GitHub/GitLab/Bitbucket
- [ ] `.env` files not committed (check .gitignore)
- [ ] Latest changes committed
- [ ] All migrations documented

### Vercel Project Setup
- [ ] Project imported from Git
- [ ] Framework detected as Next.js
- [ ] Build command: `next build`
- [ ] Output directory: `.next`
- [ ] Install command: `npm install`
- [ ] Node version: 18.x or higher

### Environment Variables Set
- [ ] All required env vars added
- [ ] Variables set for Production
- [ ] Variables set for Preview (optional)
- [ ] Sensitive keys NOT in code

### First Deployment
- [ ] Initial deployment successful
- [ ] Check deployment logs for errors
- [ ] Visit deployed URL
- [ ] Test critical paths:
  - [ ] Homepage loads
  - [ ] Login works
  - [ ] Chat works
  - [ ] Public link works
  - [ ] Admin panel accessible

## 🔗 Post-Deployment Configuration

### Supabase URL Configuration
In Supabase Dashboard → Settings → API → URL Configuration:

- [ ] Add Vercel deployment URL to allowed origins
- [ ] Add `https://your-project.vercel.app`
- [ ] Add `https://*.vercel.app` for preview deployments

### OpenAI Configuration
- [ ] Verify API key is valid
- [ ] Check API usage limits
- [ ] Set up billing alerts (optional)
- [ ] Monitor usage dashboard

### Custom Domain (Optional)
- [ ] Domain added in Vercel
- [ ] DNS configured
- [ ] SSL certificate issued
- [ ] Domain added to Supabase allowed origins

## 🧪 Production Testing

Test everything on the live deployment:

### Critical User Flows
- [ ] New user can sign up
- [ ] User can log in
- [ ] User can chat with assistant
- [ ] Messages save and load
- [ ] Public link creates new session
- [ ] Multiple users can use same public link
- [ ] Admin can view all sessions
- [ ] Data export works

### Performance
- [ ] Pages load in < 3 seconds
- [ ] Chat responses stream smoothly
- [ ] No console errors
- [ ] No 404 errors
- [ ] API routes respond quickly

### Security
- [ ] Admin panel requires authentication
- [ ] Users can't access other users' chats
- [ ] Public sessions properly isolated
- [ ] No sensitive data in client-side code
- [ ] HTTPS enforced
- [ ] CORS configured correctly

## 📊 Monitoring Setup

### Vercel Analytics (Optional)
- [ ] Enable Web Analytics
- [ ] Monitor Core Web Vitals
- [ ] Check error tracking

### Error Monitoring
- [ ] Check Vercel function logs
- [ ] Monitor API route errors
- [ ] Set up error alerts

### Database Monitoring
- [ ] Monitor Supabase usage
- [ ] Check database size
- [ ] Review slow queries

## 🎯 Go-Live Checklist

### Final Checks
- [ ] All tests passing
- [ ] No critical errors in logs
- [ ] Performance acceptable
- [ ] Mobile tested on real device
- [ ] Public chat link tested with multiple users
- [ ] Admin panel fully functional
- [ ] Data export working correctly

### Documentation
- [ ] `.env.example` up to date
- [ ] `README.md` updated with deployment info
- [ ] `VERCEL_DEPLOYMENT.md` available
- [ ] Database migrations documented

### Backup Plan
- [ ] Know how to rollback deployment
- [ ] Have database backup
- [ ] Can redeploy previous version

## 🚨 Known Issues / Limitations

Document any known issues here:

- [ ] None currently

## 📝 Common Deployment Issues & Fixes

### Issue: Build fails with TypeScript errors
**Fix**: Ensure all nullable `user_id` fields have null checks

### Issue: Environment variables not working
**Fix**:
1. Check variable names are exact
2. Redeploy after adding variables
3. Verify NEXT_PUBLIC_ prefix for client-side vars

### Issue: Database connection fails
**Fix**:
1. Verify Supabase URL and keys
2. Check RLS policies
3. Ensure tables exist

### Issue: 404 on public chat links
**Fix**:
1. Verify dynamic routes exist
2. Check `app/public/chat/[token]/page.tsx` exists
3. Ensure public_link_token column exists

### Issue: OpenAI API errors
**Fix**:
1. Verify API key is valid
2. Check API credits/billing
3. Monitor rate limits

## ✅ Deployment Complete!

Once all items are checked:

1. **Inform stakeholders** - Deployment complete
2. **Share public chat links** - Test with real users
3. **Monitor first 24 hours** - Watch for errors
4. **Gather user feedback** - Iterate and improve

---

**Last Updated**: December 2025
**Deployment Guide**: See `VERCEL_DEPLOYMENT.md` for detailed instructions
