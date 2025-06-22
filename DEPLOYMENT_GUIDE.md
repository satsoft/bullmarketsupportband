# 🚀 BMSB Dashboard Deployment Guide

## Quick Start Deployment

### 1. Vercel Deployment (Recommended)

#### Option A: Deploy from GitHub (Easiest)
1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with your GitHub account
3. Click "New Project"
4. Import `satsoft/bullmarketsupportband` repository
5. Vercel will auto-detect Next.js configuration
6. Click "Deploy"

#### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project directory
cd /path/to/bullmarketsupportband
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Link to existing project? No (first time)
# - Project name: bullmarketsupportband
# - Directory: ./ (current)
# - Want to override settings? No
```

### 2. Environment Variables Setup

**CRITICAL**: Configure these in Vercel Dashboard → Project Settings → Environment Variables

#### Required Variables
```env
# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# API Keys
COINGECKO_API_KEY=your-coingecko-api-key-here

# Security & Authentication
ADMIN_API_KEY=your-secure-admin-key-here
CRON_SECRET_KEY=your-secure-cron-key-here

# Production Configuration
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NODE_ENV=production
```

#### Variable Setup Steps
1. In Vercel Dashboard, go to your project
2. Navigate to Settings → Environment Variables
3. Add each variable with appropriate environment (Production, Preview, Development)
4. **Important**: Use the same values from your `.env.local` file

### 3. GitHub Secrets Configuration

For GitHub Actions automation to work in production:

1. Go to GitHub repository settings
2. Navigate to Secrets and variables → Actions
3. Add these Repository Secrets:

```env
# Same as Vercel environment variables
COINGECKO_API_KEY=your-coingecko-api-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ADMIN_API_KEY=your-secure-admin-key-here
CRON_SECRET_KEY=your-secure-cron-key-here
```

4. Add Repository Variable:
```env
PRODUCTION_URL=https://your-deployed-domain.com
```

### 4. Domain Configuration

#### Custom Domain Setup (Optional but Recommended)
1. Purchase domain (e.g., `bullmarketsupportband.com`)
2. In Vercel Dashboard → Domains
3. Add your custom domain
4. Configure DNS records as instructed by Vercel
5. SSL certificate will be automatically provisioned

#### DNS Configuration Example
```
Type: CNAME
Name: @ (or www)
Value: cname.vercel-dns.com
```

## Post-Deployment Steps

### 1. Verify Deployment
```bash
# Test main endpoint
curl https://your-domain.com/api/summary

# Test admin endpoint (should require auth)
curl https://your-domain.com/api/admin/test-setup

# Check sitemap
curl https://your-domain.com/sitemap.xml
```

### 2. Enable GitHub Actions
1. GitHub Actions should automatically start after deployment
2. Check the Actions tab in your repository
3. Monitor the first few runs to ensure they work correctly
4. Workflows will run on schedule:
   - Price updates: Every 10 minutes
   - BMSB calculations: Every hour
   - Daily maintenance: 1AM UTC
   - Weekly health checks: Sundays 2AM UTC

### 3. Database Verification
```bash
# Test database connection via admin endpoint
curl -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  https://your-domain.com/api/admin/test-setup
```

### 4. Monitor Initial Data Population
1. Check that cryptocurrencies are being discovered
2. Verify price updates are working
3. Ensure BMSB calculations are running
4. Monitor GitHub Actions logs for any issues

## Alternative Deployment Options

### Railway Deployment
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Netlify Deployment
1. Connect GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.next`
4. Configure environment variables
5. Deploy

### Self-Hosted (Docker)
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Production Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] GitHub repository properly set up
- [ ] Database schema deployed to Supabase
- [ ] CoinGecko API key has sufficient credits
- [ ] Test environment variables locally

### Post-Deployment
- [ ] Verify website loads correctly
- [ ] Test API endpoints work
- [ ] GitHub Actions running successfully
- [ ] Database connections working
- [ ] Monitor first 24 hours for issues
- [ ] Set up monitoring/alerts (optional)

### SEO & Analytics
- [ ] Submit to Google Search Console
- [ ] Set up Google Analytics (optional)
- [ ] Verify social media previews work
- [ ] Test mobile responsiveness
- [ ] Run Lighthouse performance audit

## Monitoring & Maintenance

### Health Checks
```bash
# Daily health check
curl https://your-domain.com/api/summary

# Weekly admin health check  
curl -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  https://your-domain.com/api/admin/test-setup
```

### Log Monitoring
- Vercel: Check Function Logs in dashboard
- GitHub Actions: Monitor workflow run logs
- Supabase: Check database performance metrics

### Performance Monitoring
- Use Vercel Analytics for traffic insights
- Monitor API response times
- Check GitHub Actions success rates
- Review CoinGecko API usage

## Troubleshooting

### Common Issues

#### GitHub Actions Failing
- Check repository secrets are set correctly
- Verify PRODUCTION_URL variable points to live site
- Ensure environment variables match between Vercel and GitHub

#### API Endpoints Not Working
- Verify environment variables in Vercel
- Check Supabase database is accessible
- Confirm CoinGecko API key is valid

#### Database Connection Issues
- Test Supabase connection in admin panel
- Verify service role key permissions
- Check database URL format

#### Rate Limiting Issues
- Monitor CoinGecko API usage
- Check GitHub Actions aren't running too frequently
- Verify rate limiting is working correctly

### Support Resources
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Supabase Deployment](https://supabase.com/docs/guides/platform)
- [GitHub Actions Troubleshooting](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows)

---

**🎯 Ready to launch!** Follow this guide step-by-step for a smooth deployment experience.