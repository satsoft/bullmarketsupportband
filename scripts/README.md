# 📜 Production Scripts Directory

This directory contains essential scripts for maintaining the BMSB dashboard in production.

## 🚀 Core Production Scripts

### Daily Automation Scripts
- **`update-current-prices.ts`** - Updates current prices from CoinGecko API
  - Run daily at 6:00 AM UTC
  - Respects rate limits (50 calls/minute)
  - Updates `daily_prices` table

- **`calculate-database-bmsb.ts`** - Calculates BMSB for all eligible tokens
  - Run daily at 6:30 AM UTC  
  - Uses stored data only (no API calls)
  - Updates `bmsb_calculations` table

- **`update-rankings.ts`** - Updates market cap rankings
  - Run daily at 7:00 AM UTC
  - Identifies ranking changes
  - Affects gold token selection (PAXG vs XAUT)

### Weekly Scripts
- **`discover-cryptocurrencies.ts`** - Discovers new tokens in top 200
  - Run weekly on Sundays
  - Adds new eligible tokens
  - Maintains token filters

### Data Management Scripts  
- **`ingest-historical-data.ts`** - Ingests 365 days of historical data
  - Run for new tokens only
  - Provides stable EMA calculations
  - One-time setup per token

- **`complete-data-refresh.ts`** - Complete system refresh
  - Emergency use only
  - Refreshes all data sources
  - Use sparingly due to API limits

### Monitoring Scripts
- **`check-database-status.ts`** - Health check for database
  - Verifies data integrity
  - Checks for missing data
  - Run weekly for monitoring

- **`check-bmsb-coverage.ts`** - Validates BMSB coverage
  - Ensures all eligible tokens have calculations
  - Identifies missing calculations
  - Run weekly for validation

- **`check-missing-bmsb.ts`** - Identifies tokens without BMSB data
  - Data validation script
  - Reports gaps in coverage
  - Run as needed

- **`final-verification-report.ts`** - System validation report
  - Comprehensive system check
  - Generates status report
  - Run monthly or after major changes

## 🔒 Security Notes

- All scripts require environment variables to be set
- CoinGecko API key must be valid and have sufficient credits
- Supabase credentials must be properly configured
- Scripts should be run in secure environment only

## 📊 Usage in Production

Most scripts will be automated via cron jobs or serverless functions. Manual execution should be limited to:
- Initial setup
- Troubleshooting
- Emergency data refresh
- System validation

## 🚨 Rate Limit Management

- Daily API usage should not exceed 70% of CoinGecko limits
- Failed API calls should implement exponential backoff
- Monitor API usage with monthly audits