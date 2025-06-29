-- Twitter Bot State and Posts Tables
-- Add these tables to your existing Supabase database

-- Table to store bot execution state
CREATE TABLE IF NOT EXISTS twitter_bot_state (
  id SERIAL PRIMARY KEY,
  token_health_data JSONB NOT NULL, -- Array of token health snapshots
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track posted tweets
CREATE TABLE IF NOT EXISTS twitter_bot_posts (
  id SERIAL PRIMARY KEY,
  post_type VARCHAR(50) NOT NULL CHECK (post_type IN ('daily_summary', 'health_change')),
  content TEXT NOT NULL,
  tweet_id VARCHAR(100), -- Twitter's tweet ID (if we want to track)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_twitter_bot_state_created_at ON twitter_bot_state(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_twitter_bot_posts_created_at ON twitter_bot_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_twitter_bot_posts_type_date ON twitter_bot_posts(post_type, created_at DESC);

-- Row Level Security (RLS) policies
ALTER TABLE twitter_bot_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_bot_posts ENABLE ROW LEVEL SECURITY;

-- Allow the service role to do everything
CREATE POLICY "Service role can manage twitter_bot_state" ON twitter_bot_state
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage twitter_bot_posts" ON twitter_bot_posts
  FOR ALL USING (auth.role() = 'service_role');

-- Optional: Allow authenticated users to read (for admin dashboard)
CREATE POLICY "Authenticated users can read twitter_bot_posts" ON twitter_bot_posts
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read twitter_bot_state" ON twitter_bot_state
  FOR SELECT USING (auth.role() = 'authenticated');