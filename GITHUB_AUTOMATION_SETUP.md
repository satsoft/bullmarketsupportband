# 🤖 GitHub Actions Automation Setup

## Overview

This project uses GitHub Actions for automated maintenance tasks:
- **Every 10 minutes**: Price updates via API endpoint
- **Every hour**: BMSB calculations via Node.js script
- **Daily at 1AM UTC**: Token discovery and rankings update
- **Weekly on Sunday**: System health checks and validation

## Required GitHub Secrets

### API Keys & Database
```
COINGECKO_API_KEY=your-coingecko-api-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Authentication
```
ADMIN_API_KEY=your-admin-api-key-here
CRON_SECRET_KEY=your-cron-secret-key-here
```

## Required GitHub Variables

### Production Environment
```
PRODUCTION_URL=https://your-domain.com
```

## Setup Instructions

### 1. Add GitHub Secrets
1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret" for each secret above
4. Copy the values from your `.env.local` file

### 2. Add GitHub Variables
1. In the same Actions settings page
2. Click the "Variables" tab
3. Click "New repository variable"
4. Add `PRODUCTION_URL` with your deployed application URL

### 3. Enable GitHub Actions
1. Ensure GitHub Actions are enabled for your repository
2. The workflows will automatically start running based on their schedules
3. You can manually trigger any workflow using "Run workflow" button

## Workflow Details

### 🔄 Price Updates (`price-updates.yml`)
- **Schedule**: Every 10 minutes (`*/10 * * * *`)
- **Method**: HTTP POST to `/api/admin/update-prices`
- **Authentication**: Uses `ADMIN_API_KEY`
- **Timeout**: 5 minutes max
- **Purpose**: Keep cryptocurrency prices fresh

### 🧮 BMSB Calculations (`bmsb-calculations.yml`)
- **Schedule**: Every hour at 5 minutes past (`5 * * * *`)
- **Method**: Node.js script execution
- **Script**: `scripts/calculate-database-bmsb.ts`
- **Timeout**: Default (6 hours max)
- **Purpose**: Update Bull Market Support Band calculations

### 📊 Daily Maintenance (`daily-maintenance.yml`)
- **Schedule**: Daily at 1:00 AM UTC (`0 1 * * *`)
- **Tasks**:
  1. Update market cap rankings
  2. Discover new cryptocurrencies
  3. Trigger top 150 update via API
- **Timeout**: 30 minutes max
- **Purpose**: Daily system maintenance after CoinGecko updates

### 🏥 Weekly Maintenance (`weekly-maintenance.yml`)
- **Schedule**: Sundays at 2:00 AM UTC (`0 2 * * 0`)
- **Tasks**:
  1. Database health check
  2. BMSB coverage validation
  3. System health report
- **Timeout**: 45 minutes max
- **Purpose**: Comprehensive system validation

## Monitoring & Troubleshooting

### Viewing Workflow Runs
1. Go to the "Actions" tab in your GitHub repository
2. Click on any workflow to see its run history
3. Click on a specific run to see detailed logs

### Common Issues

#### Authentication Errors
- Verify all secrets are set correctly
- Ensure API keys haven't expired
- Check that production URL is accessible

#### Timeout Errors
- BMSB calculations may take longer with more data
- Consider increasing timeout values if needed
- Monitor CoinGecko API rate limits

#### Script Execution Errors
- Check Node.js version compatibility
- Verify all dependencies are installed
- Review environment variable names

### Manual Triggering
Each workflow can be manually triggered:
1. Go to Actions tab
2. Select the workflow
3. Click "Run workflow"
4. Choose the branch and click "Run workflow"

## Cost Considerations

### GitHub Actions Minutes
- Free tier: 2,000 minutes/month
- **Price updates**: ~1,440 min/month (10min × 6 runs/hour × 24 hours)
- **BMSB calculations**: ~720 min/month (avg 30min × 24 runs/day)
- **Daily maintenance**: ~180 min/month (avg 6min × 30 days)
- **Weekly maintenance**: ~24 min/month (avg 6min × 4 weeks)
- **Total estimated**: ~2,364 min/month

**Recommendation**: Upgrade to GitHub Pro ($4/month) for 3,000 minutes if needed.

### CoinGecko API Usage
- Monitor daily API call usage in workflows
- Current free tier: 10,000 calls/month
- With automation: ~15,000-20,000 calls/month estimated
- **Recommendation**: Upgrade to CoinGecko Pro plan

## Production Deployment Checklist

- [ ] All GitHub secrets configured
- [ ] All GitHub variables configured  
- [ ] GitHub Actions enabled
- [ ] Production URL accessible
- [ ] API endpoints responding correctly
- [ ] Database permissions configured
- [ ] CoinGecko API key has sufficient credits
- [ ] Workflows tested manually
- [ ] Monitoring alerts configured (optional)

## Security Notes

- Never commit API keys to the repository
- Use GitHub secrets for all sensitive data
- Regularly rotate API keys
- Monitor workflow logs for security issues
- Restrict repository access to authorized users only

---

**Status**: Phase 1 automation setup completed ✅  
**Next Phase**: Deploy application and enable workflows