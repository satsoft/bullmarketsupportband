-- =====================================================
-- Supabase RLS Policies Setup Script
-- Run this in Supabase SQL Editor to fix all RLS policies
-- =====================================================

-- Remove existing policies that might conflict
DROP POLICY IF EXISTS "Allow service role full access" ON cryptocurrencies;
DROP POLICY IF EXISTS "Allow service role full access" ON daily_prices;
DROP POLICY IF EXISTS "Allow service role full access" ON weekly_prices;
DROP POLICY IF EXISTS "Allow service role full access" ON bmsb_calculations;
DROP POLICY IF EXISTS "Allow service role full access" ON exchange_mappings;
DROP POLICY IF EXISTS "Allow service role full access" ON market_cap_rankings;

DROP POLICY IF EXISTS "Allow public read access" ON cryptocurrencies;
DROP POLICY IF EXISTS "Allow public read access" ON daily_prices;
DROP POLICY IF EXISTS "Allow public read access" ON weekly_prices;
DROP POLICY IF EXISTS "Allow public read access" ON bmsb_calculations;
DROP POLICY IF EXISTS "Allow public read access" ON exchange_mappings;
DROP POLICY IF EXISTS "Allow public read access" ON market_cap_rankings;

-- =====================================================
-- CRYPTOCURRENCIES TABLE
-- =====================================================
ALTER TABLE cryptocurrencies ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON cryptocurrencies
    FOR SELECT
    TO public
    USING (true);

-- Allow service role full access for API operations
CREATE POLICY "Allow service role full access" ON cryptocurrencies
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- DAILY_PRICES TABLE  
-- =====================================================
ALTER TABLE daily_prices ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON daily_prices
    FOR SELECT
    TO public
    USING (true);

-- Allow service role full access for price updates
CREATE POLICY "Allow service role full access" ON daily_prices
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- WEEKLY_PRICES TABLE
-- =====================================================
ALTER TABLE weekly_prices ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON weekly_prices
    FOR SELECT
    TO public
    USING (true);

-- Allow service role full access for historical data
CREATE POLICY "Allow service role full access" ON weekly_prices
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- BMSB_CALCULATIONS TABLE
-- =====================================================
ALTER TABLE bmsb_calculations ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON bmsb_calculations
    FOR SELECT
    TO public
    USING (true);

-- Allow service role full access for BMSB calculations
CREATE POLICY "Allow service role full access" ON bmsb_calculations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- EXCHANGE_MAPPINGS TABLE
-- =====================================================
ALTER TABLE exchange_mappings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON exchange_mappings
    FOR SELECT
    TO public
    USING (true);

-- Allow service role full access for exchange data
CREATE POLICY "Allow service role full access" ON exchange_mappings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- MARKET_CAP_RANKINGS TABLE
-- =====================================================
ALTER TABLE market_cap_rankings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON market_cap_rankings
    FOR SELECT
    TO public
    USING (true);

-- Allow service role full access for ranking updates
CREATE POLICY "Allow service role full access" ON market_cap_rankings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that all policies are correctly applied
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('cryptocurrencies', 'daily_prices', 'weekly_prices', 'bmsb_calculations', 'exchange_mappings', 'market_cap_rankings')
ORDER BY tablename, policyname;

-- Verify RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('cryptocurrencies', 'daily_prices', 'weekly_prices', 'bmsb_calculations', 'exchange_mappings', 'market_cap_rankings');

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'RLS policies setup completed successfully!' as status;