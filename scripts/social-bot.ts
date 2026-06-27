#!/usr/bin/env tsx
/**
 * Social bot entry point.
 *   tsx scripts/social-bot.ts intraday    # event sweep (crosses, top-100, regime)
 *   tsx scripts/social-bot.ts daily        # daily snapshot
 *   tsx scripts/social-bot.ts weekly       # weekly overview (3 tweets)
 *   tsx scripts/social-bot.ts intraday --dry-run   # force dry-run regardless of env
 *
 * Posting requires SOCIAL_BOT_ENABLED=true AND SOCIAL_DRY_RUN!=false (env).
 * --dry-run forces dry-run for ad-hoc validation.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

if (process.argv.includes('--dry-run')) {
  process.env.SOCIAL_DRY_RUN = 'true';
}

import { runSocial, type Mode } from '../lib/social/runner';

const mode = (process.argv[2] as Mode) || 'intraday';
if (!['intraday', 'daily', 'weekly'].includes(mode)) {
  console.error(`Unknown mode "${mode}". Use: intraday | daily | weekly`);
  process.exit(1);
}

runSocial(mode)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[social] fatal:', e);
    process.exit(1);
  });
