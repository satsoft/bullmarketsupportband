/**
 * Configuration for the automated social (X/@BullMarketSB) bot.
 * All knobs are env-driven so cadence/caps can change without a redeploy.
 * Defaults are deliberately SAFE: dry-run on, posting disabled, low cap.
 */
export const socialConfig = {
  /** Master switch for live posting. Must be explicitly 'true' to post. */
  enabled: process.env.SOCIAL_BOT_ENABLED === 'true',
  /** When true (default), generate + log tweets but never post. */
  dryRun: process.env.SOCIAL_DRY_RUN !== 'false',

  /** Hard daily backstop (not a target). ~16/day is the free-tier ceiling. */
  dailyCap: parseInt(process.env.SOCIAL_DAILY_CAP || '8', 10),
  /** Minimum minutes between any two posts (anti-burst / anti-spam). */
  minIntervalMinutes: parseInt(process.env.SOCIAL_MIN_INTERVAL_MIN || '20', 10),
  /** Per-asset cooldown: don't re-post the same asset within this many hours. */
  perAssetCooldownHours: parseInt(process.env.SOCIAL_ASSET_COOLDOWN_H || '18', 10),

  /** Intraday band crosses only post for assets at/above this rank (always notable). */
  majorRank: parseInt(process.env.SOCIAL_MAJOR_RANK || '25', 10),
  /** Mid-tier rank: crosses post only if also a clean signal. */
  midRank: parseInt(process.env.SOCIAL_MID_RANK || '50', 10),

  /** Rapid-mover 24h % thresholds, scaled by rank tier. */
  moverPctMajor: parseFloat(process.env.SOCIAL_MOVER_PCT_MAJOR || '10'), // rank <= majorRank
  moverPctMid: parseFloat(process.env.SOCIAL_MOVER_PCT_MID || '18'),     // rank <= midRank

  /** Attempt chart images (best-effort; falls back to text-only on any failure). */
  images: process.env.SOCIAL_IMAGES !== 'false',

  /** Canonical site URL (used only for optional self-reply links). */
  siteUrl:
    process.env.SOCIAL_SITE_URL ||
    'https://www.bullmarketsupportband.com',
};

export type SocialConfig = typeof socialConfig;
