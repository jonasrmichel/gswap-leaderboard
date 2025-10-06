# Deployment Guide

## Deploying to Vercel

### Option 1: GitHub Integration (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit: GSwap leaderboard"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect SvelteKit
   - Click "Deploy"

3. **Automatic Deployments**
   - Every push to `main` will trigger a new deployment
   - Pull requests get preview deployments

### Option 2: Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Environment Variables

Currently, the app doesn't require environment variables. If you add authentication or API keys in the future:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add your variables
3. Redeploy

## Upgrading to Persistent Storage

The current implementation uses in-memory storage, which resets on each deployment. To make data persistent:

### Option A: Vercel KV (Redis)

1. Enable Vercel KV in your project dashboard
2. Install the package:
   ```bash
   npm install @vercel/kv
   ```
3. Update `src/lib/leaderboardStore.ts` to use KV storage

### Option B: Vercel Postgres

1. Enable Vercel Postgres in your project dashboard
2. Install the package:
   ```bash
   npm install @vercel/postgres
   ```
3. Create a table schema and update the store

### Option C: External Database

- MongoDB Atlas
- Supabase
- PlanetScale
- Any other database service

Add connection strings as environment variables.

## Custom Domain

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions

## Performance Tips

1. **Edge Functions**: API routes run on Vercel Edge by default
2. **Caching**: Consider adding cache headers for leaderboard data
3. **Rate Limiting**: Add rate limiting to prevent API abuse
4. **Background Jobs**: Use Vercel Cron for periodic wallet updates

## Monitoring

- Check deployment logs in Vercel Dashboard
- Set up error tracking (Sentry, etc.)
- Monitor API usage and performance

## Post-Deployment

Your app will be live at: `https://your-project-name.vercel.app`

Test the deployment:
1. Visit the URL
2. Add a wallet address
3. Verify the leaderboard updates correctly
4. Check all sorting options work
5. Test on mobile devices

## Troubleshooting

### Build Fails
- Check build logs in Vercel Dashboard
- Ensure all dependencies are in `package.json`
- Run `npm run build` locally first

### API Errors
- Check function logs in Vercel Dashboard
- Verify external API endpoints are accessible
- Add error logging to API routes

### Puppeteer Issues
Note: Puppeteer may have issues in serverless environments. If you add transaction scraping:
- Consider using a lighter alternative
- Use Vercel's headless Chrome layer
- Or use a separate service for scraping

## Cost Considerations

Vercel Free Tier includes:
- 100GB bandwidth
- Unlimited serverless function executions
- Automatic HTTPS
- Preview deployments

Upgrade to Pro if you need:
- More bandwidth
- Team collaboration
- Advanced analytics
- Priority support
