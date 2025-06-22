# Bull Market Support Band Dashboard - Backend Implementation Plan

## Overview
This plan outlines the complete backend architecture for ingesting, processing, and maintaining cryptocurrency data to calculate and display Bull Market Support Band (BMSB) indicators for the top 100 cryptocurrencies by market cap.

## Bull Market Support Band Requirements
- **20-week Simple Moving Average (SMA)**: Sum of closing prices over 20 weeks / 20
- **21-week Exponential Moving Average (EMA)**: Weighted average giving more weight to recent prices
- **Support Band**: Area between 20-week SMA and 21-week EMA
- **Data Requirements**: Minimum 21 weeks of historical weekly data per cryptocurrency

## Architecture Overview

### 1. Database Schema (Supabase)

#### Tables

**cryptocurrencies**
```sql
id (uuid, primary key)
coingecko_id (text, unique, not null) -- e.g., "bitcoin", "ethereum"
symbol (text, not null) -- e.g., "BTC", "ETH"
name (text, not null) -- e.g., "Bitcoin", "Ethereum"
current_rank (integer) -- Current market cap ranking
is_active (boolean, default true) -- Whether to track this crypto
is_stablecoin (boolean, default false) -- Whether this is a stablecoin
categories (text[]) -- Array of categories from CoinGecko (includes "stablecoins")
created_at (timestamp)
updated_at (timestamp)
```

**market_cap_rankings**
```sql
id (uuid, primary key)
cryptocurrency_id (uuid, foreign key)
rank (integer, not null)
market_cap (numeric)
recorded_at (timestamp, not null)
created_at (timestamp)
```

**weekly_prices**
```sql
id (uuid, primary key)
cryptocurrency_id (uuid, foreign key)
week_start_date (date, not null) -- Monday of the week
week_end_date (date, not null) -- Sunday of the week
open_price (numeric)
high_price (numeric)
low_price (numeric)
close_price (numeric) -- Most important for BMSB calculations
volume (numeric)
market_cap (numeric)
created_at (timestamp)
updated_at (timestamp)
-- Unique constraint on (cryptocurrency_id, week_start_date)
```

**daily_prices** (for live updates)
```sql
id (uuid, primary key)
cryptocurrency_id (uuid, foreign key)
date (date, not null)
open_price (numeric)
high_price (numeric)
low_price (numeric)
close_price (numeric)
volume (numeric)
market_cap (numeric)
created_at (timestamp)
-- Unique constraint on (cryptocurrency_id, date)
```

**bmsb_calculations**
```sql
id (uuid, primary key)
cryptocurrency_id (uuid, foreign key)
calculation_date (date, not null) -- Date of calculation
sma_20_week (numeric) -- 20-week Simple Moving Average
ema_21_week (numeric) -- 21-week Exponential Moving Average
sma_20_week_previous (numeric) -- Previous week's 20-week SMA
ema_21_week_previous (numeric) -- Previous week's 21-week EMA
support_band_lower (numeric) -- Lower bound (min of SMA/EMA)
support_band_upper (numeric) -- Upper bound (max of SMA/EMA)
current_price (numeric) -- Price at time of calculation
price_position (text) -- "above_band", "in_band", "below_band"
sma_trend (text) -- "increasing", "decreasing", "flat"
ema_trend (text) -- "increasing", "decreasing", "flat"
band_health (text) -- "healthy" (both increasing), "mixed" (one increasing), "weak" (both decreasing), "stablecoin" (not applicable)
is_applicable (boolean, default true) -- Whether BMSB analysis applies (false for stablecoins)
created_at (timestamp)
-- Unique constraint on (cryptocurrency_id, calculation_date)
```

### 2. Data Ingestion Strategy

#### Phase 1: Initial Historical Data Load
1. **Cryptocurrency Discovery**
   - Fetch top 200 cryptocurrencies by market cap from CoinGecko
   - Use `/coins/markets` endpoint to get categories and identify stablecoins
   - Store in `cryptocurrencies` table with stablecoin classification
   - Track top 200 to account for ranking changes over time

2. **Historical Data Ingestion**
   - For each cryptocurrency, fetch 2+ years of weekly OHLCV data
   - Use CoinGecko's `/coins/{id}/ohlc` endpoint with `vs_currency=usd&days=730`
   - Convert daily data to weekly aggregates (Monday-Sunday)
   - Store in `weekly_prices` table

3. **Market Cap Historical Rankings**
   - Fetch historical market cap data for ranking tracking
   - Store weekly snapshots in `market_cap_rankings`

#### Phase 2: Ongoing Data Maintenance
1. **Daily Updates**
   - Fetch current day's OHLCV data for all tracked cryptocurrencies
   - Store in `daily_prices` table
   - Update current week's data in `weekly_prices` (rolling update)

2. **Weekly Processing**
   - Every Monday, finalize previous week's data
   - Create new week entries in `weekly_prices`
   - Recalculate BMSB for all cryptocurrencies

3. **Market Cap Ranking Updates**
   - Daily fetch of current top 200 by market cap
   - Update `current_rank` in `cryptocurrencies` table
   - Store historical ranking in `market_cap_rankings`

### 3. API Integration (CoinGecko)

#### Endpoints to Use
1. **Coins List**: `/coins/list` - Get all available coins
2. **Markets**: `/coins/markets` - Current market data and rankings
3. **Historical OHLC**: `/coins/{id}/ohlc` - Historical price data
4. **Current Price**: `/simple/price` - Real-time price updates

#### Rate Limiting Strategy
- CoinGecko Free Tier: 10-50 calls/minute
- Implement exponential backoff retry logic
- Queue system for batch processing
- Consider upgrading to Pro plan for higher limits

### 4. Calculation Engine

#### BMSB Calculation Functions
```typescript
// 20-week Simple Moving Average
function calculate20WeekSMA(weeklyPrices: number[]): number {
  const last20Weeks = weeklyPrices.slice(-20);
  return last20Weeks.reduce((sum, price) => sum + price, 0) / 20;
}

// 21-week Exponential Moving Average
function calculate21WeekEMA(weeklyPrices: number[], previousEMA?: number): number {
  const multiplier = 2 / (21 + 1); // 0.0909
  const currentPrice = weeklyPrices[weeklyPrices.length - 1];
  
  if (!previousEMA) {
    // First calculation - use SMA of first 21 weeks
    const first21Weeks = weeklyPrices.slice(0, 21);
    previousEMA = first21Weeks.reduce((sum, price) => sum + price, 0) / 21;
  }
  
  return (currentPrice - previousEMA) * multiplier + previousEMA;
}

// BMSB Analysis
function analyzeBMSBPosition(currentPrice: number, sma: number, ema: number): string {
  const lowerBound = Math.min(sma, ema);
  const upperBound = Math.max(sma, ema);
  
  if (currentPrice > upperBound) return "above_band";
  if (currentPrice < lowerBound) return "below_band";
  return "in_band";
}

// Trend Analysis
function analyzeTrend(current: number, previous: number): string {
  const threshold = 0.001; // 0.1% threshold to avoid noise
  const change = (current - previous) / previous;
  
  if (change > threshold) return "increasing";
  if (change < -threshold) return "decreasing";
  return "flat";
}

// Stablecoin Detection
function isStablecoin(crypto: {
  symbol: string;
  name: string;
  categories?: string[];
  priceVolatility?: number;
}): boolean {
  // Check if explicitly categorized as stablecoin by CoinGecko
  if (crypto.categories?.includes("stablecoins")) {
    return true;
  }
  
  // Common stablecoin patterns
  const stablecoinKeywords = [
    'usd', 'usdt', 'usdc', 'busd', 'dai', 'tusd', 'pax', 'gusd', 
    'husd', 'susd', 'frax', 'fei', 'lusd', 'usdp', 'ust', 'ustc'
  ];
  
  const symbolLower = crypto.symbol.toLowerCase();
  const nameLower = crypto.name.toLowerCase();
  
  // Check symbol and name for stablecoin indicators
  const hasStablecoinKeyword = stablecoinKeywords.some(keyword => 
    symbolLower.includes(keyword) || nameLower.includes(keyword)
  );
  
  // Additional check: very low price volatility (if available)
  const hasLowVolatility = crypto.priceVolatility ? crypto.priceVolatility < 0.02 : false;
  
  return hasStablecoinKeyword || hasLowVolatility;
}

// Band Health Analysis for Visual Indicators
function analyzeBandHealth(
  smaTrend: string, 
  emaTrend: string, 
  isStablecoinFlag: boolean = false
): {
  health: string;
  color: string;
  description: string;
} {
  // Handle stablecoins separately
  if (isStablecoinFlag) {
    return {
      health: "stablecoin",
      color: "gray",
      description: "Stablecoin - BMSB analysis not applicable"
    };
  }
  
  const bothIncreasing = smaTrend === "increasing" && emaTrend === "increasing";
  const oneIncreasing = (smaTrend === "increasing") !== (emaTrend === "increasing");
  
  if (bothIncreasing) {
    return {
      health: "healthy",
      color: "green",
      description: "Both 20W SMA and 21W EMA are increasing - Strong bull market support"
    };
  }
  
  if (oneIncreasing) {
    return {
      health: "mixed", 
      color: "yellow",
      description: `${smaTrend === "increasing" ? "20W SMA" : "21W EMA"} increasing, ${smaTrend === "increasing" ? "21W EMA" : "20W SMA"} ${smaTrend === "increasing" ? emaTrend : smaTrend} - Mixed signals`
    };
  }
  
  return {
    health: "weak",
    color: "red", 
    description: "Both 20W SMA and 21W EMA are decreasing - Weakening support"
  };
}
```

### 5. Backend Services Architecture

#### Service 1: Data Ingestion Service
- **Purpose**: Fetch and store cryptocurrency data
- **Frequency**: 
  - Historical: One-time setup
  - Daily: Current prices and market caps
  - Weekly: Finalize weekly aggregates
- **Tech Stack**: Node.js/Python with cron jobs

#### Service 2: Calculation Service
- **Purpose**: Calculate BMSB indicators
- **Triggers**: 
  - After weekly data updates
  - On-demand for real-time dashboard
- **Tech Stack**: Node.js/Python with mathematical libraries

#### Service 3: API Service
- **Purpose**: Serve data to frontend
- **Endpoints**:
  - `/api/cryptocurrencies` - List of tracked cryptos
  - `/api/cryptocurrencies/{id}/bmsb` - BMSB data for specific crypto
  - `/api/rankings/top100` - Current top 100 with BMSB status and band health
  - `/api/summary` - Dashboard summary statistics
- **Sample API Response for Top 100**:
```json
{
  "rank": 1,
  "cryptocurrency": {
    "id": "bitcoin",
    "symbol": "BTC", 
    "name": "Bitcoin",
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
    }
  }
}
```
- **Tech Stack**: Next.js API routes or Express.js

#### Frontend Integration Notes
- **Status Box Colors**: 
  - Green (both increasing) 
  - Yellow (mixed signals)
  - Red (both decreasing)
  - Gray (stablecoin - N/A)
- **Hover Tooltip**: Display detailed trend information and band health description
- **Simple Display**: Show only colored boxes on main dashboard
- **Detailed View**: Full BMSB analysis available on hover or click
- **Stablecoin Handling**: Gray boxes with "N/A" or "Stablecoin" text on hover

### 6. Implementation Phases

#### Phase 1: Foundation (Week 1)
- [ ] Set up Supabase database
- [ ] Create database schema and tables
- [ ] Implement basic CoinGecko API client
- [ ] Create cryptocurrency discovery and storage logic

#### Phase 2: Historical Data (Week 2)
- [ ] Implement historical data fetching
- [ ] Create weekly data aggregation logic
- [ ] Build initial BMSB calculation engine
- [ ] Populate database with 2+ years of data for top 200 cryptos

#### Phase 3: Live Updates (Week 3)
- [ ] Implement daily price update service
- [ ] Create weekly data finalization process
- [ ] Build real-time BMSB recalculation
- [ ] Set up automated cron jobs

#### Phase 4: API & Integration (Week 4)
- [ ] Build API endpoints for frontend
- [ ] Implement caching layer (Redis)
- [ ] Add error handling and monitoring
- [ ] Connect frontend to backend APIs

#### Phase 5: Optimization (Week 5)
- [ ] Performance optimization
- [ ] Add comprehensive logging
- [ ] Implement data validation
- [ ] Set up monitoring and alerts

### 7. Technical Considerations

#### Data Validation
- Validate price data for anomalies (sudden spikes/drops)
- Cross-reference with multiple data sources when possible
- Implement data quality checks

#### Performance Optimization
- Index database tables appropriately
- Implement caching for frequently accessed data
- Use database views for complex queries
- Consider read replicas for scaling

#### Error Handling
- Graceful API failure handling
- Data consistency checks
- Automated retry mechanisms
- Comprehensive logging and monitoring

#### Scalability
- Design for horizontal scaling
- Implement queue system for heavy processing
- Consider microservices architecture for larger scale

### 8. Monitoring & Maintenance

#### Key Metrics to Monitor
- API response times
- Data freshness (last update timestamps)
- Calculation accuracy
- Error rates
- Database performance

#### Maintenance Tasks
- Regular data integrity checks
- Performance optimization
- API rate limit monitoring
- Database maintenance and backups

### 9. Security Considerations
- Secure API key storage (environment variables)
- Rate limiting on public APIs
- Input validation and sanitization
- Database security best practices

### 10. Future Enhancements
- Additional technical indicators
- Machine learning predictions
- Real-time alerts and notifications
- Mobile app support
- Historical backtesting capabilities

## Getting Started
1. Set up Supabase project and obtain credentials
2. Implement database schema
3. Create CoinGecko API integration
4. Begin with Phase 1 implementation

This plan provides a comprehensive roadmap for building a robust, scalable backend system to support the Bull Market Support Band dashboard with real-time data and historical analysis capabilities.