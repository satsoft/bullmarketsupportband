# Twitter Bot Setup Guide

This guide walks you through setting up the automated Twitter bot for Bull Market Support Band (BMSB) market analysis.

## Overview

The Twitter bot automatically posts:
- **Daily Market Summaries** (9 AM UTC): Overview of market health with token counts and top performers
- **Real-time Health Alerts** (every 30 minutes): Notifications when tokens change from healthy to weak or vice versa
- **Optional Screenshots**: Visual market dashboard captures for enhanced engagement

## Prerequisites

1. **Twitter Developer Account**: Apply at [developer.twitter.com](https://developer.twitter.com/)
2. **Existing BMSB Project**: This bot integrates with your existing market analysis system
3. **Database Access**: Requires Supabase for state persistence

## 1. Twitter API Setup

### Get Twitter API Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new app or use existing one
3. Generate API keys with **Read and Write** permissions
4. Save these credentials:
   - API Key
   - API Secret
   - Access Token
   - Access Token Secret

### Required Twitter API Permissions
- ✅ Read and Write permissions
- ✅ Tweet permission
- ✅ Media upload permission

## 2. Database Setup

Run the SQL schema to create required tables:

```bash
# Apply the Twitter bot database schema
psql -h your-supabase-host -U postgres -d postgres -f lib/database-schema-twitter.sql
```

Or apply manually in Supabase SQL editor:
```sql
-- See lib/database-schema-twitter.sql for complete schema
```

## 3. Environment Configuration

Add Twitter credentials to your `.env.local`:

```env
# Twitter API Credentials
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_SECRET=your_twitter_access_secret

# Bot Configuration
INCLUDE_SCREENSHOTS=true
TWITTER_BOT_HANDLE=@YourBotHandle
NEXT_PUBLIC_BASE_URL=https://your-domain.com
```

## 4. Install Dependencies

```bash
npm install twitter-api-v2 node-cron puppeteer @types/node-cron
```

## 5. Testing the Bot

### Test Daily Summary
```bash
npm run twitter-bot:daily
```

### Test Health Change Alerts
```bash
npm run twitter-bot:alerts
```

### Test Complete Cycle
```bash
npm run twitter-bot
```

## 6. Production Deployment

### Option A: Long-running Daemon (Recommended)

For VPS or dedicated server:

```bash
# Start the daemon
npm run twitter-bot:daemon

# With PM2 for process management
npm install -g pm2
pm2 start "npm run twitter-bot:daemon" --name "twitter-bot"
pm2 startup
pm2 save
```

### Option B: Cron Jobs

For shared hosting or cron-based scheduling:

```bash
# Daily summary at 9 AM UTC
0 9 * * * cd /path/to/project && npm run twitter-bot:daily

# Health checks every 30 minutes
*/30 * * * * cd /path/to/project && npm run twitter-bot:alerts
```

### Option C: Serverless Functions

Deploy individual functions on Vercel/Netlify with scheduled triggers.

## 7. Monitoring & Maintenance

### Logs

Monitor bot activity:
```bash
# View daemon logs
pm2 logs twitter-bot

# View database posts
# Check twitter_bot_posts table in Supabase
```

### Error Handling

The bot includes automatic error handling:
- Failed API calls are logged
- Screenshots failures won't stop posting
- Rate limiting is built-in
- State persistence prevents duplicate posts

### Database Maintenance

Clean up old state data periodically:
```sql
-- Keep only last 30 days of state
DELETE FROM twitter_bot_state 
WHERE created_at < NOW() - INTERVAL '30 days';
```

## 8. Customization

### Tweet Templates

Modify tweet content in `lib/twitter-bot-service.ts`:
- `generateDailySummaryTweet()`
- `generateHealthChangeAlert()`

### Scheduling

Adjust timing in `lib/twitter-bot-scheduler.ts`:
```typescript
// Daily summary at different time
cron.schedule('0 12 * * *', async () => { // 12 PM UTC

// More frequent health checks
cron.schedule('*/15 * * * *', async () => { // Every 15 minutes
```

### Screenshot Styling

Modify visual appearance in `lib/screenshot-service.ts`:
- Viewport dimensions
- Custom CSS styling
- Branding elements

## 9. Free Tier Considerations

### Twitter API Limits
- **Free Tier**: 1,500 tweets/month
- **Basic Plan**: $100/month for 50,000 tweets
- Plan for ~50-100 tweets/month with current schedule

### Resource Usage
- Screenshots use ~50MB RAM per capture
- Database stores ~1KB per state snapshot
- Minimal CPU usage for text processing

### Cost Optimization
- Disable screenshots: `INCLUDE_SCREENSHOTS=false`
- Reduce health check frequency
- Use summary-only mode for low-volume accounts

## 10. Troubleshooting

### Common Issues

**"Twitter API authentication failed"**
- Verify all 4 credentials are correct
- Check API key permissions (Read + Write)
- Ensure tokens haven't expired

**"Screenshot capture failed"**
- Install Chrome/Chromium: `apt-get install chromium-browser`
- Set headless mode: Check Puppeteer configuration
- Disable screenshots temporarily

**"No health changes detected"**
- Verify BMSB data is updating
- Check database connectivity
- Ensure sufficient historical data

**"Daily summary already posted"**
- Normal behavior - prevents duplicates
- Reset: Delete today's entry from `twitter_bot_posts`

### Debug Mode

Enable verbose logging:
```bash
DEBUG=twitter-bot npm run twitter-bot:daemon
```

## 11. Security Best Practices

- ✅ Never commit API keys to version control
- ✅ Use environment variables for all secrets
- ✅ Rotate API keys regularly
- ✅ Monitor for unauthorized API usage
- ✅ Enable 2FA on Twitter developer account
- ✅ Use read-only database connections where possible

## Support

For issues with the Twitter bot:
1. Check logs for error messages
2. Verify API credentials and permissions
3. Test individual components
4. Check database connectivity
5. Review environment variables

The bot is designed to be robust and self-healing, with comprehensive error handling and state management.