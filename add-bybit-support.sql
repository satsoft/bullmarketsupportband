-- Add Bybit support to exchange_mappings table

-- Drop the existing constraint
ALTER TABLE exchange_mappings DROP CONSTRAINT IF EXISTS exchange_mappings_exchange_name_check;

-- Add the new constraint with Bybit
ALTER TABLE exchange_mappings ADD CONSTRAINT exchange_mappings_exchange_name_check 
CHECK (exchange_name IN ('binance', 'coinbase', 'kucoin', 'bybit', 'uniswap', 'dexscreener'));