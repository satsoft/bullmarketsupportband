# Bull Market Support Band - Backend Setup Guide

This guide walks you through setting up the complete backend infrastructure for the Bull Market Support Band dashboard.

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- CoinGecko API account (optional, free tier available)

## Phase 1: Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned
3. Go to Settings → API to get your credentials

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

3. (Optional) Add CoinGecko API key for higher rate limits:
   ```env
   COINGECKO_API_KEY=your_coingecko_api_key
   ```

### 3. Create Database Schema

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `lib/database-schema.sql`
4. Click "Run" to execute the schema

This creates:
- **cryptocurrencies** - Master list of tracked cryptocurrencies
- **market_cap_rankings** - Historical ranking data
- **weekly_prices** - Weekly OHLCV data for BMSB calculations
- **daily_prices** - Daily price updates
- **bmsb_calculations** - Calculated BMSB indicators

## Phase 2: Data Ingestion

### 1. Discover Cryptocurrencies

Run the cryptocurrency discovery script to populate your database:

```bash
npm run discover-cryptos
```

This will:
- Fetch top 200 cryptocurrencies from CoinGecko
- Detect and classify stablecoins
- Store cryptocurrency metadata
- Record initial market cap rankings

**Note:** This process takes 5-10 minutes due to API rate limiting.

### 2. Calculate BMSB Indicators

Once cryptocurrencies are discovered, calculate BMSB indicators:

```bash
npm run calculate-bmsb
```

This will:
- Fetch 2+ years of historical price data
- Convert daily data to weekly aggregates
- Calculate 20-week SMA and 21-week EMA
- Analyze trends and band health
- Store results in the database

**Note:** This process takes 30-60 minutes for 200 cryptocurrencies.

## Phase 3: API Testing

### 1. Start Development Server

```bash
npm run dev
```

### 2. Test API Endpoints

Once the server is running, test these endpoints:

#### Get Top 100 Rankings
```bash
curl http://localhost:3000/api/rankings/top100
```

#### Get Specific Cryptocurrency BMSB Data
```bash
curl http://localhost:3000/api/cryptocurrencies/{id}/bmsb
```

#### Get All Cryptocurrencies
```bash
curl http://localhost:3000/api/cryptocurrencies
```

#### Get Dashboard Summary
```bash
curl http://localhost:3000/api/summary
```

### 3. Expected Response Format

The `/api/rankings/top100` endpoint returns:

```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "cryptocurrency": {
        "id": "uuid",
        "symbol": "BTC",
        "name": "Bitcoin",
        "coingecko_id": "bitcoin",
        "current_price": 45000
      },
      "bmsb": {
        "sma_20_week": 42000,
        "ema_21_week": 43500,
        "price_position": "above_band",
        "band_health": {
          "health": "healthy",
          "color": "green",
          "description": "Both 20W SMA and 21W EMA are increasing - Strong bull market support"
        },
        "trends": {
          "sma_trend": "increasing",
          "ema_trend": "increasing"
        },
        "is_applicable": true,
        "calculation_date": "2024-01-15"
      }
    }
  ],
  "count": 100,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Phase 4: Ongoing Maintenance

### 1. Daily Updates

Set up cron jobs or scheduled functions to run:

```bash
# Update market cap rankings (daily)
npm run update-rankings

# Recalculate BMSB (weekly, preferably Monday)
npm run calculate-bmsb
```

### 2. Monitoring

Monitor these key metrics:
- API response times
- Data freshness (check `/api/summary`)
- Error rates in application logs
- Database performance

### 3. Rate Limiting

The CoinGecko free tier allows:
- 10-50 requests per minute
- The implementation includes automatic rate limiting
- Consider upgrading to Pro for higher limits

## Band Health Color Coding

The visual indicators in the frontend use these colors:

| Band Health | Color | Description |
|-------------|-------|-------------|
| **Healthy** | 🟢 Green | Both 20W SMA and 21W EMA increasing |
| **Mixed** | 🟡 Yellow | One indicator increasing, one decreasing |
| **Weak** | 🔴 Red | Both 20W SMA and 21W EMA decreasing |
| **Stablecoin** | ⚪ Gray | BMSB analysis not applicable |

## Troubleshooting

### Common Issues

1. **"No data found" errors**
   - Ensure cryptocurrency discovery completed successfully
   - Check if BMSB calculations finished without errors
   - Verify environment variables are set correctly

2. **Rate limit errors**
   - The system includes automatic retry logic
   - Reduce batch sizes if needed
   - Consider upgrading CoinGecko plan

3. **Database connection errors**
   - Verify Supabase credentials in `.env.local`
   - Check if database schema was created successfully
   - Ensure Row Level Security policies are in place

### Data Validation

Run these queries in Supabase SQL Editor to validate data:

```sql
-- Check cryptocurrency count
SELECT COUNT(*) FROM cryptocurrencies WHERE is_active = true;

-- Check BMSB calculation coverage
SELECT COUNT(*) FROM bmsb_calculations 
WHERE calculation_date >= CURRENT_DATE - INTERVAL '7 days';

-- Check stablecoin detection
SELECT symbol, name, is_stablecoin 
FROM cryptocurrencies 
WHERE is_stablecoin = true
ORDER BY current_rank;
```

## Next Steps

1. **Production Deployment**: Deploy to Vercel, Netlify, or your preferred platform
2. **Monitoring**: Set up error tracking and performance monitoring
3. **Caching**: Implement Redis caching for better performance
4. **Real-time Updates**: Add WebSocket support for live price updates
5. **Mobile Support**: Create responsive design for mobile devices

## Support

For issues with:
- **Supabase**: Check [Supabase documentation](https://supabase.com/docs)
- **CoinGecko API**: Refer to [CoinGecko API docs](https://www.coingecko.com/en/api/documentation)
- **Next.js**: See [Next.js documentation](https://nextjs.org/docs)

The backend implementation follows the comprehensive plan outlined in `backendsetup.md`.