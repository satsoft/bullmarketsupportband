-- Social automation schema (X/@BullMarketSB event bot).
-- Adds project X handle to assets, per-asset social state for cross/entry detection
-- and dedup, a market-level state row for regime/breadth tracking, and a post log.

-- 1) Project X handle on each asset (from CoinGecko twitter_screen_name).
ALTER TABLE cryptocurrencies
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT;

-- 2) Per-asset social state — the source of truth for "what changed since last run".
CREATE TABLE IF NOT EXISTS asset_social_state (
  cryptocurrency_id UUID PRIMARY KEY REFERENCES cryptocurrencies(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  last_position TEXT,                 -- 'above_band' | 'in_band' | 'below_band' | NULL
  last_rank INTEGER,
  in_top100 BOOLEAN DEFAULT false,
  last_cross_up_at TIMESTAMP WITH TIME ZONE,    -- last below/in -> above
  last_cross_down_at TIMESTAMP WITH TIME ZONE,  -- last above/in -> below
  last_top100_entry_at TIMESTAMP WITH TIME ZONE,
  last_posted_at TIMESTAMP WITH TIME ZONE,      -- per-asset min-interval guard
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3) Market-level state (single row, id=1) for breadth/regime flip detection.
CREATE TABLE IF NOT EXISTS market_social_state (
  id INTEGER PRIMARY KEY DEFAULT 1,
  pct_above NUMERIC,                  -- % of tracked non-stablecoins above their band
  regime TEXT,                        -- 'bull' (>=50% above) | 'bear'
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT market_social_state_singleton CHECK (id = 1)
);

-- 4) Post log — every post, dry-run, and skip (with reason) for observability.
CREATE TABLE IF NOT EXISTS social_posts (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,           -- weekly_overview | daily_snapshot | band_cross_up |
                                      -- band_cross_down | top100_entry | rapid_mover | regime_flip
  symbol TEXT,                        -- NULL for market-wide posts
  content TEXT,
  tweet_id TEXT,
  status TEXT NOT NULL,               -- posted | dry_run | skipped_cap | skipped_interval |
                                      -- skipped_dedup | error
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_created_at ON social_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_posts_status_date ON social_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_social_state_symbol ON asset_social_state(symbol);

-- RLS: service role manages everything; these tables are not public-readable.
ALTER TABLE asset_social_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_social_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages asset_social_state" ON asset_social_state;
CREATE POLICY "Service role manages asset_social_state" ON asset_social_state
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages market_social_state" ON market_social_state;
CREATE POLICY "Service role manages market_social_state" ON market_social_state
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages social_posts" ON social_posts;
CREATE POLICY "Service role manages social_posts" ON social_posts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
