-- Add previous_health column to track health changes
ALTER TABLE bmsb_calculations 
ADD COLUMN IF NOT EXISTS previous_health VARCHAR(10);

-- Update existing records to set previous_health = current health
-- This prevents false alerts on first deployment
UPDATE bmsb_calculations 
SET previous_health = band_health 
WHERE previous_health IS NULL;