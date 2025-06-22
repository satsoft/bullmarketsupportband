import { CachedAPI } from './api-cache';

interface CoinGeckoConfig {
  baseURL: string;
  apiKey?: string;
  rateLimitPerMinute: number;
}

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  categories?: string[];
}

interface CoinGeckoOHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

class CoinGeckoAPI {
  private config: CoinGeckoConfig;
  private requestQueue: Array<() => Promise<unknown>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  private requestWindow = 60000; // 1 minute

  constructor(config: CoinGeckoConfig) {
    this.config = config;
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, unknown> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          await this.enforceRateLimit();
          
          const url = new URL(this.config.baseURL + endpoint);
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.append(key, String(value));
            }
          });

          const headers: Record<string, string> = {
            'Accept': 'application/json',
          };

          if (this.config.apiKey) {
            headers['x-cg-demo-api-key'] = this.config.apiKey;
          }

          const response = await fetch(url.toString(), { headers });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API Error (${response.status}):`, errorText);
            
            if (response.status === 429) {
              throw new Error(`Rate limit exceeded: ${response.statusText}`);
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          resolve(data);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counter if window has passed
    if (now - this.lastRequestTime > this.requestWindow) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }

    // Check if we've hit the rate limit
    if (this.requestCount >= this.config.rateLimitPerMinute) {
      const waitTime = this.requestWindow - (now - this.lastRequestTime);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
      }
    }

    this.requestCount++;
  }

  private async processQueue(): Promise<void> {
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        await request();
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1200)); // 50 requests per minute = 1.2s between requests
      }
    }
    
    this.isProcessingQueue = false;
  }

  async getMarketData(params: {
    vs_currency?: string;
    order?: string;
    per_page?: number;
    page?: number;
    sparkline?: boolean;
    price_change_percentage?: string;
    category?: string;
  } = {}): Promise<CoinGeckoMarketData[]> {
    const defaultParams = {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: 100,
      page: 1,
      sparkline: false,
      price_change_percentage: '24h',
      ...params
    };

    const cacheKey = `market-data-${JSON.stringify(defaultParams)}`;
    
    return CachedAPI.getOrFetch(
      cacheKey,
      () => this.makeRequest<CoinGeckoMarketData[]>('/coins/markets', defaultParams),
      10 // Cache for 10 minutes
    );
  }

  async getCoinsList(): Promise<Array<{id: string; symbol: string; name: string}>> {
    return this.makeRequest<Array<{id: string; symbol: string; name: string}>>('/coins/list');
  }

  async getOHLCData(coinId: string, days: number = 365): Promise<CoinGeckoOHLCData[]> {
    // Note: Demo API is limited to 365 days max
    const limitedDays = Math.min(days, 365);
    
    const data = await this.makeRequest<number[][]>(`/coins/${coinId}/ohlc`, {
      vs_currency: 'usd',
      days: limitedDays
    });

    return data.map(([timestamp, open, high, low, close]) => ({
      timestamp,
      open,
      high,
      low,
      close
    }));
  }

  async getHistoricalData(coinId: string, date: string): Promise<{
    id: string;
    market_data: {
      current_price: { usd: number };
      market_cap: { usd: number };
      total_volume: { usd: number };
    };
  }> {
    return this.makeRequest(`/coins/${coinId}/history`, {
      date,
      localization: false
    });
  }

  async getMarketChart(coinId: string, days: number = 180): Promise<{
    prices: number[][];
    market_caps: number[][];
    total_volumes: number[][];
  }> {
    // Note: Demo API is limited to 365 days max
    const limitedDays = Math.min(days, 365);
    const cacheKey = `market-chart-${coinId}-${limitedDays}`;
    
    return CachedAPI.getOrFetch(
      cacheKey,
      () => this.makeRequest(`/coins/${coinId}/market_chart`, {
        vs_currency: 'usd',
        days: limitedDays,
        interval: 'daily'
      }),
      30 // Cache historical data for 30 minutes
    );
  }

  async getCurrentPrice(coinIds: string[]): Promise<Record<string, {usd: number}>> {
    const cacheKey = `current-price-${coinIds.sort().join(',')}`;
    
    return CachedAPI.getOrFetch(
      cacheKey,
      () => this.makeRequest<Record<string, {usd: number}>>('/simple/price', {
        ids: coinIds.join(','),
        vs_currencies: 'usd'
      }),
      2 // Cache for 2 minutes (prices change frequently)
    );
  }

  async getCoinDetails(coinId: string): Promise<{
    id: string;
    symbol: string;
    name: string;
    categories: string[];
    market_cap_rank: number;
    market_data: {
      current_price: { usd: number };
      market_cap: { usd: number };
      price_change_percentage_24h: number;
    };
  }> {
    return this.makeRequest(`/coins/${coinId}`, {
      localization: false,
      tickers: false,
      market_data: true,
      community_data: false,
      developer_data: false,
      sparkline: false
    });
  }
}

// Create and export the API instance
const coinGeckoAPI = new CoinGeckoAPI({
  baseURL: process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3',
  apiKey: process.env.COINGECKO_API_KEY,
  rateLimitPerMinute: parseInt(process.env.API_RATE_LIMIT_PER_MINUTE || '50')
});

export { coinGeckoAPI, CoinGeckoAPI };
export type { CoinGeckoMarketData, CoinGeckoOHLCData };