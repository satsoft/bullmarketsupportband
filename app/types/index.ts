export interface Ticker {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  status: 'up' | 'down';
  lastUpdate: Date;
  // BMSB specific fields
  rank: number;
  sma_20_week: number | null;
  ema_21_week: number | null;
  support_band_lower: number | null;
  support_band_upper: number | null;
  price_position: 'above_band' | 'in_band' | 'below_band' | null;
  sma_trend: 'increasing' | 'decreasing' | null;
  ema_trend: 'increasing' | 'decreasing' | null;
  band_health: 'healthy' | 'weak';
  is_stablecoin: boolean; // Keep for compatibility, but will always be false
  calculation_date: string | null;
  // Exchange mapping for TradingView
  tradingview_symbol?: string;
}

export interface BMSBApiResponse {
  success: boolean;
  data: Ticker[];
  count: number;
  metadata: {
    total_cryptocurrencies: number;
    with_bmsb_data: number;
    excluded_token_types: string[];
    excluded_tokens: Array<{
      symbol: string;
      category: string;
    }>;
    last_updated: string;
  };
  error?: string;
}