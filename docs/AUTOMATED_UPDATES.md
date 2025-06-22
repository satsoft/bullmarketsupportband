# 🤖 Automated Price Updates with GitHub Actions

This setup uses **GitHub Actions** (free) to automatically update cryptocurrency prices without consuming your API quota unnecessarily.

## 📋 Setup Instructions

### 1. Deploy to Vercel/Netlify

First, deploy your app to a hosting service:

```bash
# Deploy to Vercel (recommended)
npx vercel --prod

# Or deploy to Netlify
npm run build && netlify deploy --prod
```

### 2. Set GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

Add these secrets:
- `DEPLOYMENT_URL`: Your deployed app URL (e.g., `https://your-app.vercel.app`)
- `CRON_SECRET`: Use the same value as in your `.env.local` file (`bmsbsecret2025`)

### 3. Enable GitHub Actions

The workflows are already configured! They'll automatically start running once you push to GitHub.

## 🕐 Available Schedules

### Option 1: Hourly Updates (Default - Active)
**File**: `.github/workflows/update-prices.yml`
- **Frequency**: Every hour
- **API Usage**: ~24 calls/day (1 call for top 20, 2 calls daily for full update)
- **Battery Life**: ~15 days with your 365-day quota

### Option 2: Conservative Updates (4-hourly)
**File**: `.github/workflows/conservative-update.yml`
- **Frequency**: Every 4 hours  
- **API Usage**: ~6 calls/day
- **Battery Life**: ~60 days with your 365-day quota
- **Status**: Currently disabled

### Option 3: Daily Top Crypto Updates
**File**: `.github/workflows/update-top-cryptocurrencies.yml`
- **Frequency**: Daily at 6 AM UTC
- **Purpose**: Discovers new top cryptocurrencies and updates rankings
- **API Usage**: ~1 call/day

## 🔄 Switching Between Schedules

### To Use Conservative (4-hourly) Updates:

1. **Disable hourly updates**:
   Edit `.github/workflows/update-prices.yml`:
   ```yaml
   # on:
   #   schedule:
   #     - cron: '0 * * * *'
   #   workflow_dispatch:
   
   on:
     workflow_dispatch: # Manual only
   ```

2. **Enable conservative updates**:
   Edit `.github/workflows/conservative-update.yml`:
   ```yaml
   on:
     schedule:
       - cron: '0 */4 * * *'
     workflow_dispatch:
   ```

## 📊 API Usage Summary

| Schedule | API Calls/Day | Days with 365 quota | Best For |
|----------|---------------|---------------------|----------|
| Hourly | ~24 | 15 days | Active trading |
| 4-hourly | ~6 | 60 days | Regular monitoring |
| Manual only | 0 | ∞ | Full control |

## 🎛️ Manual Controls

### Trigger Updates Manually
1. Go to your GitHub repo → Actions
2. Select any workflow
3. Click "Run workflow"

### Monitor Updates
- Check GitHub Actions logs for success/failure
- View API usage in your dashboard

### Local Testing
```bash
# Test the API endpoints locally
curl -X POST "http://localhost:3000/api/cron/update-prices" \
  -H "Authorization: Bearer bmsbsecret2025"

curl -X POST "http://localhost:3000/api/admin/update-top-150" \
  -H "Authorization: Bearer bmsbsecret2025"
```

## 🚨 Troubleshooting

### Workflow Not Running
- Check if GitHub Actions are enabled in your repo settings
- Verify secrets are set correctly
- Check if the workflow files are in `.github/workflows/`

### API Errors
- Verify your COINGECKO_API_KEY is valid
- Check Supabase credentials
- Monitor rate limiting in logs

### Authentication Failures
- Ensure CRON_SECRET matches between `.env.local` and GitHub secrets
- Verify DEPLOYMENT_URL is correct and accessible

## 🔒 Security

- API endpoints require Bearer token authentication
- Secrets are encrypted in GitHub
- No sensitive data exposed in logs

## 💡 Pro Tips

1. **Start with conservative updates** to preserve API quota
2. **Monitor the first few runs** to ensure everything works
3. **Use manual triggers** for immediate updates when needed
4. **Check logs regularly** to catch issues early

## 🎯 Cost Breakdown

**GitHub Actions Free Tier**:
- 2,000 minutes/month
- Each update takes ~30 seconds
- **4,000 updates per month available**

**Your needs**:
- Hourly: 720 updates/month
- 4-hourly: 180 updates/month

**Plenty of headroom!** 🎉