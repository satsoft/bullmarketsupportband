/**
 * Data access for the social bot: current asset snapshot + social state + post log.
 */
import { supabaseAdmin } from '../supabase';

export type Position = 'above_band' | 'in_band' | 'below_band';

export interface AssetSnapshot {
  id: string;
  symbol: string;
  name: string;
  rank: number | null;
  handle: string | null;
  logoUrl: string | null;
  price: number | null;
  change24h: number | null;
  sma: number | null;
  ema: number | null;
  bandLower: number | null;
  bandUpper: number | null;
  position: Position | null;
  health: 'healthy' | 'weak' | null;
}

export interface AssetState {
  cryptocurrency_id: string;
  symbol: string;
  last_position: Position | null;
  last_rank: number | null;
  in_top100: boolean;
  last_cross_up_at: string | null;
  last_cross_down_at: string | null;
  last_top100_entry_at: string | null;
  last_posted_at: string | null;
}

/** Load the current snapshot of all active, non-stablecoin assets with a BMSB calc. */
export async function loadSnapshot(limit = 175): Promise<AssetSnapshot[]> {
  const { data: cryptos, error } = await supabaseAdmin
    .from('cryptocurrencies')
    .select('id, symbol, name, current_rank, twitter_handle, logo_url, price_change_percentage_24h, is_stablecoin')
    .eq('is_active', true)
    .eq('is_stablecoin', false)
    .order('current_rank', { ascending: true })
    .limit(limit);
  if (error) throw error;
  if (!cryptos?.length) return [];

  const ids = cryptos.map((c) => c.id);
  const { data: calcs } = await supabaseAdmin
    .from('bmsb_calculations')
    .select('cryptocurrency_id, sma_20_week, ema_21_week, support_band_lower, support_band_upper, current_price, price_position, band_health, calculation_date')
    .in('cryptocurrency_id', ids)
    .order('calculation_date', { ascending: false });

  const calcByAsset = new Map<string, NonNullable<typeof calcs>[number]>();
  for (const c of calcs ?? []) {
    if (!calcByAsset.has(c.cryptocurrency_id)) calcByAsset.set(c.cryptocurrency_id, c);
  }

  const out: AssetSnapshot[] = [];
  for (const c of cryptos) {
    const b = calcByAsset.get(c.id);
    if (!b || b.sma_20_week == null || b.ema_21_week == null) continue; // need a real band
    const lower = b.support_band_lower ?? Math.min(b.sma_20_week, b.ema_21_week);
    const upper = b.support_band_upper ?? Math.max(b.sma_20_week, b.ema_21_week);
    out.push({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      rank: c.current_rank,
      handle: c.twitter_handle,
      logoUrl: c.logo_url ?? null,
      price: b.current_price ?? null,
      change24h: c.price_change_percentage_24h ?? null,
      sma: b.sma_20_week,
      ema: b.ema_21_week,
      bandLower: lower,
      bandUpper: upper,
      position: (b.price_position as Position) ?? null,
      health: (b.band_health as 'healthy' | 'weak') ?? null,
    });
  }
  return out;
}

export async function loadStates(ids: string[]): Promise<Map<string, AssetState>> {
  const map = new Map<string, AssetState>();
  if (!ids.length) return map;
  const { data } = await supabaseAdmin
    .from('asset_social_state')
    .select('*')
    .in('cryptocurrency_id', ids);
  for (const r of data ?? []) map.set(r.cryptocurrency_id, r as AssetState);
  return map;
}

export async function upsertState(row: Partial<AssetState> & { cryptocurrency_id: string; symbol: string }) {
  await supabaseAdmin
    .from('asset_social_state')
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'cryptocurrency_id' });
}

export async function loadMarketState(): Promise<{ pct_above: number | null; regime: string | null } | null> {
  const { data } = await supabaseAdmin
    .from('market_social_state')
    .select('pct_above, regime')
    .eq('id', 1)
    .single();
  return data ?? null;
}

export async function saveMarketState(pctAbove: number, regime: 'bull' | 'bear') {
  await supabaseAdmin
    .from('market_social_state')
    .upsert({ id: 1, pct_above: pctAbove, regime, updated_at: new Date().toISOString() }, { onConflict: 'id' });
}

export type PostStatus =
  | 'posted'
  | 'dry_run'
  | 'skipped_cap'
  | 'skipped_interval'
  | 'skipped_dedup'
  | 'error';

export async function recordPost(args: {
  event_type: string;
  symbol?: string | null;
  content: string;
  tweet_id?: string | null;
  status: PostStatus;
  reason?: string | null;
}) {
  await supabaseAdmin.from('social_posts').insert({
    event_type: args.event_type,
    symbol: args.symbol ?? null,
    content: args.content,
    tweet_id: args.tweet_id ?? null,
    status: args.status,
    reason: args.reason ?? null,
  });
}

/** How many real posts went out in the last 24h (for the daily cap). */
export async function postsInLast24h(): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from('social_posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'posted')
    .gte('created_at', since);
  return count ?? 0;
}

/** Timestamp of the most recent real post (for the global min-interval). */
export async function lastPostedAt(): Promise<Date | null> {
  const { data } = await supabaseAdmin
    .from('social_posts')
    .select('created_at')
    .eq('status', 'posted')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data?.created_at ? new Date(data.created_at) : null;
}
