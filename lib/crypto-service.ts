import { supabaseAdmin } from './supabase';
import { coinGeckoAPI, CoinGeckoMarketData } from './coingecko';

export interface Cryptocurrency {
  id: string;
  coingecko_id: string;
  symbol: string;
  name: string;
  current_rank: number;
  is_active: boolean;
  is_stablecoin: boolean;
  categories: string[];
  created_at: string;
  updated_at: string;
}

export class CryptocurrencyService {
  
  // Stablecoin detection function
  static isStablecoin(crypto: {
    symbol: string;
    name: string;
    categories?: string[];
    priceVolatility?: number;
  }): boolean {
    // Check if explicitly categorized as stablecoin by CoinGecko
    if (crypto.categories?.includes("stablecoins")) {
      return true;
    }
    
    // Common stablecoin patterns
    const stablecoinKeywords = [
      'usd', 'usdt', 'usdc', 'busd', 'dai', 'tusd', 'pax', 'gusd', 
      'husd', 'susd', 'frax', 'fei', 'lusd', 'usdp', 'ust', 'ustc'
    ];
    
    const symbolLower = crypto.symbol.toLowerCase();
    const nameLower = crypto.name.toLowerCase();
    
    // Check symbol and name for stablecoin indicators
    const hasStablecoinKeyword = stablecoinKeywords.some(keyword => 
      symbolLower.includes(keyword) || nameLower.includes(keyword)
    );
    
    // Additional check: very low price volatility (if available)
    const hasLowVolatility = crypto.priceVolatility ? crypto.priceVolatility < 0.02 : false;
    
    return hasStablecoinKeyword || hasLowVolatility;
  }

  // Discover and store top cryptocurrencies
  static async discoverAndStoreCryptocurrencies(limit: number = 200): Promise<void> {
    try {
      console.log(`Discovering top ${limit} cryptocurrencies...`);
      
      // Fetch market data in batches (CoinGecko limits to 250 per request)
      const batchSize = 250;
      const pages = Math.ceil(limit / batchSize);
      let allMarketData: CoinGeckoMarketData[] = [];
      
      for (let page = 1; page <= pages; page++) {
        const itemsThisPage = page === pages ? limit - (page - 1) * batchSize : batchSize;
        
        const marketData = await coinGeckoAPI.getMarketData({
          per_page: itemsThisPage,
          page: page
        });
        
        allMarketData = allMarketData.concat(marketData);
        
        // Small delay between batch requests
        if (page < pages) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      console.log(`Retrieved ${allMarketData.length} cryptocurrencies from CoinGecko`);

      // Process and store each cryptocurrency
      let processedCount = 0;
      for (const crypto of allMarketData) {
        try {
          console.log(`Processing ${crypto.symbol} (${processedCount + 1}/${allMarketData.length})...`);
          
          // For demo API, skip detailed calls and use basic stablecoin detection
          // const detailedCrypto = await coinGeckoAPI.getCoinDetails(crypto.id);
          
          const isStablecoinFlag = this.isStablecoin({
            symbol: crypto.symbol,
            name: crypto.name,
            categories: [] // Will be updated later when we have more API quota
          });

          // Upsert cryptocurrency data
          const { error } = await supabaseAdmin
            .from('cryptocurrencies')
            .upsert({
              coingecko_id: crypto.id,
              symbol: crypto.symbol.toUpperCase(),
              name: crypto.name,
              current_rank: crypto.market_cap_rank,
              is_active: true,
              is_stablecoin: isStablecoinFlag,
              categories: [], // Will be updated later
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'coingecko_id'
            });

          if (error) {
            console.error(`Error storing cryptocurrency ${crypto.symbol}:`, error);
          } else {
            console.log(`✅ Stored/updated ${crypto.symbol} (${crypto.name})`);
            processedCount++;
          }

          // No additional rate limiting delay needed - markets endpoint is efficient
          
        } catch (error) {
          console.error(`Error processing ${crypto.symbol}:`, error);
          continue;
        }
      }

      // Record market cap rankings
      await this.recordMarketCapRankings(allMarketData);

      console.log('Cryptocurrency discovery and storage completed');
      
    } catch (error) {
      console.error('Error in cryptocurrency discovery:', error);
      throw error;
    }
  }

  // Record market cap rankings
  static async recordMarketCapRankings(marketData: CoinGeckoMarketData[]): Promise<void> {
    try {
      const recordedAt = new Date().toISOString();
      
      // Get cryptocurrency IDs from database
      const { data: cryptocurrencies, error: fetchError } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('id, coingecko_id')
        .in('coingecko_id', marketData.map(crypto => crypto.id));

      if (fetchError) {
        throw fetchError;
      }

      const cryptoMap = new Map(
        cryptocurrencies?.map(crypto => [crypto.coingecko_id, crypto.id]) || []
      );

      // Prepare ranking data
      const rankingData = marketData
        .filter(crypto => cryptoMap.has(crypto.id))
        .map(crypto => ({
          cryptocurrency_id: cryptoMap.get(crypto.id),
          rank: crypto.market_cap_rank,
          market_cap: crypto.market_cap,
          recorded_at: recordedAt
        }));

      // Insert ranking data
      const { error } = await supabaseAdmin
        .from('market_cap_rankings')
        .insert(rankingData);

      if (error) {
        throw error;
      }

      console.log(`Recorded market cap rankings for ${rankingData.length} cryptocurrencies`);
      
    } catch (error) {
      console.error('Error recording market cap rankings:', error);
      throw error;
    }
  }

  // Get top cryptocurrencies by rank
  static async getTopCryptocurrencies(limit: number = 100): Promise<Cryptocurrency[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('*')
        .eq('is_active', true)
        .order('current_rank', { ascending: true })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
      
    } catch (error) {
      console.error('Error fetching top cryptocurrencies:', error);
      throw error;
    }
  }

  // Update cryptocurrency rankings
  static async updateCryptocurrencyRankings(): Promise<void> {
    try {
      console.log('Updating cryptocurrency rankings...');
      
      const marketData = await coinGeckoAPI.getMarketData({
        per_page: 200,
        page: 1
      });

      // Update current rankings
      for (const crypto of marketData) {
        const { error } = await supabaseAdmin
          .from('cryptocurrencies')
          .update({ 
            current_rank: crypto.market_cap_rank,
            updated_at: new Date().toISOString()
          })
          .eq('coingecko_id', crypto.id);

        if (error) {
          console.error(`Error updating rank for ${crypto.symbol}:`, error);
        }
      }

      // Record new rankings
      await this.recordMarketCapRankings(marketData);

      console.log('Cryptocurrency rankings updated successfully');
      
    } catch (error) {
      console.error('Error updating cryptocurrency rankings:', error);
      throw error;
    }
  }

  // Get cryptocurrency by CoinGecko ID
  static async getCryptocurrencyByCoingeckoId(coingeckoId: string): Promise<Cryptocurrency | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('*')
        .eq('coingecko_id', coingeckoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return data;
      
    } catch (error) {
      console.error('Error fetching cryptocurrency by CoinGecko ID:', error);
      throw error;
    }
  }
}