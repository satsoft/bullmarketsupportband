-- Bull Market Support Band Database Schema
-- Execute this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptocurrencies table
CREATE TABLE cryptocurrencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coingecko_id TEXT UNIQUE NOT NULL,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    current_rank INTEGER,
    is_active BOOLEAN DEFAULT true,
    is_stablecoin BOOLEAN DEFAULT false,
    categories TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market cap rankings table
CREATE TABLE market_cap_rankings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cryptocurrency_id UUID REFERENCES cryptocurrencies(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    market_cap NUMERIC,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weekly prices table
CREATE TABLE weekly_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cryptocurrency_id UUID REFERENCES cryptocurrencies(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    open_price NUMERIC,
    high_price NUMERIC,
    low_price NUMERIC,
    close_price NUMERIC,
    volume NUMERIC,
    market_cap NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cryptocurrency_id, week_start_date)
);

-- Daily prices table (for live updates)
CREATE TABLE daily_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cryptocurrency_id UUID REFERENCES cryptocurrencies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    open_price NUMERIC,
    high_price NUMERIC,
    low_price NUMERIC,
    close_price NUMERIC,
    volume NUMERIC,
    market_cap NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cryptocurrency_id, date)
);

-- BMSB calculations table
CREATE TABLE bmsb_calculations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cryptocurrency_id UUID REFERENCES cryptocurrencies(id) ON DELETE CASCADE,
    calculation_date DATE NOT NULL,
    sma_20_week NUMERIC,
    ema_21_week NUMERIC,
    sma_20_week_previous NUMERIC,
    ema_21_week_previous NUMERIC,
    support_band_lower NUMERIC,
    support_band_upper NUMERIC,
    current_price NUMERIC,
    price_position TEXT CHECK (price_position IN ('above_band', 'in_band', 'below_band')),
    sma_trend TEXT CHECK (sma_trend IN ('increasing', 'decreasing', 'flat')),
    ema_trend TEXT CHECK (ema_trend IN ('increasing', 'decreasing', 'flat')),
    band_health TEXT CHECK (band_health IN ('healthy', 'mixed', 'weak', 'stablecoin')),
    is_applicable BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cryptocurrency_id, calculation_date)
);

-- Exchange mappings table
CREATE TABLE exchange_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cryptocurrency_id UUID REFERENCES cryptocurrencies(id) ON DELETE CASCADE,
    exchange_name TEXT NOT NULL CHECK (exchange_name IN ('binance', 'coinbase', 'kucoin', 'bybit', 'uniswap', 'dexscreener')),
    trading_pair TEXT NOT NULL, -- e.g., 'BTCUSDT', 'BTC-USD', 'ETH/USDC'
    is_available BOOLEAN DEFAULT true,
    is_preferred BOOLEAN DEFAULT false, -- Mark the preferred exchange for each crypto
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verification_method TEXT, -- 'api_check', 'manual', 'web_scrape'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cryptocurrency_id, exchange_name)
);

-- Indexes for performance
CREATE INDEX idx_cryptocurrencies_coingecko_id ON cryptocurrencies(coingecko_id);
CREATE INDEX idx_cryptocurrencies_current_rank ON cryptocurrencies(current_rank);
CREATE INDEX idx_cryptocurrencies_is_active ON cryptocurrencies(is_active);
CREATE INDEX idx_market_cap_rankings_recorded_at ON market_cap_rankings(recorded_at);
CREATE INDEX idx_weekly_prices_week_start_date ON weekly_prices(week_start_date);
CREATE INDEX idx_daily_prices_date ON daily_prices(date);
CREATE INDEX idx_bmsb_calculations_calculation_date ON bmsb_calculations(calculation_date);
CREATE INDEX idx_exchange_mappings_crypto_id ON exchange_mappings(cryptocurrency_id);
CREATE INDEX idx_exchange_mappings_exchange_name ON exchange_mappings(exchange_name);
CREATE INDEX idx_exchange_mappings_is_available ON exchange_mappings(is_available);
CREATE INDEX idx_exchange_mappings_is_preferred ON exchange_mappings(is_preferred);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_cryptocurrencies_updated_at BEFORE UPDATE ON cryptocurrencies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_prices_updated_at BEFORE UPDATE ON weekly_prices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_mappings_updated_at BEFORE UPDATE ON exchange_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies for API access
ALTER TABLE cryptocurrencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_cap_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE bmsb_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_mappings ENABLE ROW LEVEL SECURITY;

-- Allow public read access to all tables
CREATE POLICY "Allow public read access" ON cryptocurrencies FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON market_cap_rankings FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON weekly_prices FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON daily_prices FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON bmsb_calculations FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON exchange_mappings FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access" ON cryptocurrencies FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON market_cap_rankings FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON weekly_prices FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON daily_prices FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON bmsb_calculations FOR ALL USING (true);
CREATE POLICY "Allow service role full access" ON exchange_mappings FOR ALL USING (true);