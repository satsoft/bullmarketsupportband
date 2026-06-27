#!/usr/bin/env tsx
/**
 * Enrich cryptocurrencies.twitter_handle from CoinGecko's `twitter_screen_name`.
 * One-time backfill + safe to re-run (only fills assets missing a handle unless --all).
 * Rate-limited for the CoinGecko Demo tier. Validates handles before storing.
 *
 * Usage: tsx scripts/backfill-twitter-handles.ts [--all]
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { supabaseAdmin } from '../lib/supabase';

const CG_KEY = process.env.COINGECKO_API_KEY || '';
const CG_BASE = process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3';
const REFILL_ALL = process.argv.includes('--all');

// X handle rules: 1-15 chars, letters/digits/underscore.
const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let query = supabaseAdmin
    .from('cryptocurrencies')
    .select('id, symbol, coingecko_id, twitter_handle')
    .eq('is_active', true)
    .order('current_rank', { ascending: true });

  const { data: assets, error } = await query;
  if (error) throw error;

  const targets = (assets || []).filter((a) => REFILL_ALL || !a.twitter_handle);
  console.log(`Found ${assets?.length || 0} active assets; ${targets.length} to enrich${REFILL_ALL ? ' (--all)' : ''}.`);

  let updated = 0,
    cleared = 0,
    failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const a = targets[i];
    try {
      const url = `${CG_BASE}/coins/${a.coingecko_id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`;
      const res = await fetch(url, { headers: { 'x-cg-demo-api-key': CG_KEY } });
      if (!res.ok) {
        console.log(`  ${a.symbol}: HTTP ${res.status} — skip`);
        failed++;
        await sleep(2600);
        continue;
      }
      const json = await res.json();
      const raw: string | null = json?.links?.twitter_screen_name ?? null;
      const handle = raw && HANDLE_RE.test(raw) ? raw : null;

      await supabaseAdmin
        .from('cryptocurrencies')
        .update({ twitter_handle: handle })
        .eq('id', a.id);

      if (handle) {
        updated++;
        console.log(`  ✅ ${a.symbol} -> @${handle} (${i + 1}/${targets.length})`);
      } else {
        cleared++;
        console.log(`  – ${a.symbol}: no valid handle (${i + 1}/${targets.length})`);
      }
    } catch (e) {
      failed++;
      console.log(`  ✗ ${a.symbol}: ${(e as Error).message}`);
    }
    // ~23 req/min, under CoinGecko Demo limit.
    await sleep(2600);
  }

  console.log(`\nDone. handles set: ${updated}, none: ${cleared}, failed: ${failed}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
