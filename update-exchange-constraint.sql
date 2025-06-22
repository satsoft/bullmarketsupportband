-- Update exchange_mappings table to use KuCoin instead of MEXC
-- First, clear existing data since we're changing the logic
TRUNCATE TABLE exchange_mappings;

-- Drop the existing constraint
ALTER TABLE exchange_mappings DROP CONSTRAINT IF EXISTS exchange_mappings_exchange_name_check;

-- Add the new constraint with KuCoin
ALTER TABLE exchange_mappings ADD CONSTRAINT exchange_mappings_exchange_name_check 
CHECK (exchange_name IN ('binance', 'coinbase', 'kucoin', 'uniswap', 'dexscreener'));