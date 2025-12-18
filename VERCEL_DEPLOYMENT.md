# Deploying to Vercel

This guide will help you deploy your chatbot application to Vercel.

## Prerequisites

- GitHub/GitLab/Bitbucket account (to connect your repository)
- Vercel account (free tier works fine)
- Supabase project already set up
- OpenAI API key

## Step 1: Prepare Your Repository

1. Make sure all your code is committed and pushed to your Git repository:
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

2. Ensure you have a `.gitignore` file that excludes sensitive files:
```
node_modules/
.next/
.env
.env.local
.vercel
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your Git repository
4. Vercel will auto-detect Next.js and configure build settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `next build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install` or `yarn install`

5. Click "Deploy"

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Follow the prompts and deploy to production:
```bash
vercel --prod
```

## Step 3: Configure Environment Variables

After deployment, add your environment variables in the Vercel dashboard:

1. Go to your project on Vercel
2. Click "Settings" → "Environment Variables"
3. Add the following variables:

### Required Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

### How to Get These Values

- **Supabase URL & Anon Key**:
  - Go to your Supabase project
  - Settings → API
  - Copy "Project URL" and "anon/public" key

- **OpenAI API Key**:
  - Go to [platform.openai.com](https://platform.openai.com)
  - API Keys section
  - Create new secret key

### Setting Environment Variables

For each variable:
1. Click "Add New"
2. Enter the key name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
3. Enter the value
4. Select environments: Production, Preview, Development
5. Click "Save"

**Important**: After adding environment variables, redeploy your project:
- Go to "Deployments" tab
- Click the three dots on the latest deployment
- Click "Redeploy"

## Step 4: Update Supabase Configuration

Update your Supabase project to allow requests from your Vercel domain:

1. Go to Supabase Dashboard
2. Settings → API → URL Configuration
3. Add your Vercel URL to allowed origins:
   - `https://your-project.vercel.app`
   - `https://*.vercel.app` (for preview deployments)

## Step 5: Verify Deployment

1. Visit your deployed URL: `https://your-project.vercel.app`
2. Test the following:
   - [ ] User signup and login
   - [ ] Creating a conversation
   - [ ] Chatting with assistants
   - [ ] Admin panel access
   - [ ] Public chat links (share and test in incognito)
   - [ ] Data export functionality

## Step 6: Custom Domain (Optional)

To use a custom domain:

1. Go to your Vercel project
2. Settings → Domains
3. Add your domain (e.g., `mychatbot.com`)
4. Follow DNS configuration instructions
5. Update Supabase allowed origins with your custom domain

## Troubleshooting

### Build Fails

If your build fails, check:
- Node version compatibility (add `engines` in package.json)
- Missing dependencies in package.json
- TypeScript errors

Add this to `package.json` if needed:
```json
{
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Environment Variables Not Working

- Make sure variable names are exactly correct
- Variables starting with `NEXT_PUBLIC_` are exposed to the browser
- Variables without `NEXT_PUBLIC_` are server-side only
- Redeploy after adding new variables

### Database Connection Issues

- Verify Supabase URL and anon key are correct
- Check Supabase project is active and accessible
- Verify RLS policies allow public access where needed

### 404 Errors on Public Chat

- Make sure dynamic routes are properly set up
- Check `app/public/chat/[token]/page.tsx` exists
- Verify Supabase tables and RLS policies

### OpenAI API Errors

- Verify API key is valid and has credits
- Check API key has correct permissions
- Monitor OpenAI usage dashboard

## Performance Optimization

### Enable Caching

Vercel automatically caches static assets. For better performance:

1. Use Next.js Image component for images
2. Enable ISR (Incremental Static Regeneration) where appropriate
3. Minimize client-side JavaScript

### Monitor Performance

1. Use Vercel Analytics (free):
   - Project Settings → Analytics
   - Enable Web Analytics

2. Monitor function execution:
   - Deployments → Function logs
   - Check for slow API routes

## Automatic Deployments

Vercel automatically deploys:
- **Production**: When you push to `main` branch
- **Preview**: When you create a pull request
- Each preview deployment gets a unique URL

### Configure Branch Deployments

1. Settings → Git
2. Configure production branch
3. Enable/disable preview deployments

## Security Recommendations

1. **Rate Limiting**: Add rate limiting to public endpoints
2. **CORS**: Configure proper CORS headers
3. **API Keys**: Never commit API keys to Git
4. **RLS Policies**: Ensure Supabase RLS policies are secure
5. **Input Validation**: Validate all user inputs

## Cost Considerations

### Vercel Free Tier Includes:
- Unlimited deployments
- 100GB bandwidth/month
- Automatic HTTPS
- Serverless Functions (100GB-hrs/month)

### When You Might Need Pro:
- More than 100GB bandwidth
- Team collaboration features
- Advanced analytics
- Priority support

### Supabase Free Tier Includes:
- 500MB database
- 2GB bandwidth
- 50,000 monthly active users

### OpenAI Costs:
- Pay per API call
- Monitor usage at platform.openai.com

## Maintenance

### Updating Your App

1. Make changes locally
2. Test thoroughly
3. Commit and push to Git
4. Vercel automatically deploys
5. Test on production URL

### Rolling Back

If something breaks:
1. Go to Deployments
2. Find a working deployment
3. Click "Promote to Production"

## Support and Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Vercel Support**: https://vercel.com/support

## Summary Checklist

Before going live:
- [ ] All environment variables configured
- [ ] Supabase RLS policies tested
- [ ] Public chat links tested
- [ ] Admin panel secured
- [ ] Custom domain configured (if applicable)
- [ ] Analytics enabled
- [ ] Error monitoring set up
- [ ] Database backups configured (Supabase)
- [ ] OpenAI usage limits set
- [ ] User authentication working
- [ ] Data export tested
- [ ] Mobile responsiveness verified

## Next Steps

After successful deployment:
1. Share public chat links with users
2. Monitor analytics and errors
3. Gather user feedback
4. Plan feature updates
5. Set up monitoring alerts

---

**Congratulations! Your chatbot is now live on Vercel! 🎉**
