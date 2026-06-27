/**
 * Server-side data loader for individual asset BMSB pages.
 * Fetches a single asset's latest BMSB snapshot directly from Supabase so the values
 * can be rendered in the initial HTML (SSR) — unlike the client-only dashboard.
 */

import { supabaseAdmin } from './supabase';
import exchangeChecker from './exchange-checker';

export interface AssetBMSB {
  symbol: string;
  name: string;
  price: number | null;
  sma_20_week: number | null;
  ema_21_week: number | null;
  band_lower: number | null;
  band_upper: number | null;
  price_position: 'above_band' | 'in_band' | 'below_band' | null;
  sma_trend: 'increasing' | 'decreasing' | null;
  ema_trend: 'increasing' | 'decreasing' | null;
  band_health: 'healthy' | 'weak' | null;
  /** Signed % distance from the nearest band edge (positive = above upper, negative = below lower, 0 = inside). */
  distance_pct: number | null;
  change_pct_24h: number | null;
  calculation_date: string | null;
  tradingview_symbol?: string;
  last_updated: string | null;
}

/**
 * Load the latest BMSB snapshot for a symbol. Returns null if the asset isn't found
 * or has no BMSB calculation yet (so the page can 404 rather than render an empty shell).
 */
export async function getAssetBMSB(symbol: string): Promise<AssetBMSB | null> {
  const sym = symbol.toUpperCase();

  const { data: crypto } = await supabaseAdmin
    .from('cryptocurrencies')
    .select('id, symbol, name, price_change_percentage_24h, price_updated_at')
    .eq('symbol', sym)
    .eq('is_active', true)
    .single();

  if (!crypto) return null;

  const { data: bmsb } = await supabaseAdmin
    .from('bmsb_calculations')
    .select('*')
    .eq('cryptocurrency_id', crypto.id)
    .order('calculation_date', { ascending: false })
    .limit(1)
    .single();

  // A page is only worth indexing if it has real BMSB values.
  if (!bmsb || bmsb.sma_20_week == null || bmsb.ema_21_week == null) return null;

  const { data: daily } = await supabaseAdmin
    .from('daily_prices')
    .select('close_price, date')
    .eq('cryptocurrency_id', crypto.id)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const { data: mapping } = await supabaseAdmin
    .from('exchange_mappings')
    .select('exchange_name, trading_pair')
    .eq('cryptocurrency_id', crypto.id)
    .eq('is_available', true)
    .order('is_preferred', { ascending: false })
    .limit(1)
    .single();

  const price = daily?.close_price ?? bmsb.current_price ?? null;
  const lower =
    bmsb.support_band_lower ?? Math.min(bmsb.sma_20_week, bmsb.ema_21_week);
  const upper =
    bmsb.support_band_upper ?? Math.max(bmsb.sma_20_week, bmsb.ema_21_week);

  let distance_pct: number | null = null;
  if (price != null) {
    if (price > upper) distance_pct = ((price - upper) / upper) * 100;
    else if (price < lower) distance_pct = ((price - lower) / lower) * 100;
    else distance_pct = 0;
  }

  const tradingview_symbol = mapping
    ? exchangeChecker.getTradingViewSymbol(mapping.exchange_name, mapping.trading_pair)
    : undefined;

  return {
    symbol: crypto.symbol,
    name: crypto.name,
    price,
    sma_20_week: bmsb.sma_20_week,
    ema_21_week: bmsb.ema_21_week,
    band_lower: lower,
    band_upper: upper,
    price_position: bmsb.price_position ?? null,
    sma_trend: bmsb.sma_trend ?? null,
    ema_trend: bmsb.ema_trend ?? null,
    band_health: bmsb.band_health ?? null,
    distance_pct,
    change_pct_24h: crypto.price_change_percentage_24h ?? null,
    calculation_date: bmsb.calculation_date ?? null,
    tradingview_symbol,
    last_updated: daily?.date ?? crypto.price_updated_at ?? bmsb.calculation_date ?? null,
  };
}
