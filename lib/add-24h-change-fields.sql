-- Add 24h price change fields to cryptocurrencies table
-- This data is already available from CoinGecko's market data API

ALTER TABLE cryptocurrencies 
ADD COLUMN IF NOT EXISTS price_change_24h NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_change_percentage_24h NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add index for better performance when fetching 24h changes
CREATE INDEX IF NOT EXISTS idx_cryptocurrencies_price_updated_at 
ON cryptocurrencies(price_updated_at);

-- Add comment to document the purpose
COMMENT ON COLUMN cryptocurrencies.price_change_24h IS 'Absolute 24h price change in USD from CoinGecko';
COMMENT ON COLUMN cryptocurrencies.price_change_percentage_24h IS '24h price change percentage from CoinGecko'; 
COMMENT ON COLUMN cryptocurrencies.price_updated_at IS 'Last time price change data was updated';