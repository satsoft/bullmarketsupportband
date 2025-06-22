import { supabaseAdmin } from './supabase';

interface ExchangeMapping {
  id: string;
  cryptocurrency_id: string;
  exchange_name: string;
  trading_pair: string;
  is_available: boolean;
  is_preferred: boolean;
  last_checked: string;
  verification_method: string;
}

interface ExchangeAPI {
  name: string;
  checkAvailability: (symbol: string) => Promise<{ available: boolean; tradingPair?: string }>;
  getPreferredPair: (symbol: string) => string;
}

class ExchangeChecker {
  private exchanges: ExchangeAPI[] = [
    {
      name: 'binance',
      checkAvailability: this.checkBinance.bind(this),
      getPreferredPair: (symbol: string) => `${symbol}USDT`
    },
    {
      name: 'coinbase',
      checkAvailability: this.checkCoinbase.bind(this),
      getPreferredPair: (symbol: string) => `${symbol}-USD`
    },
    {
      name: 'kucoin',
      checkAvailability: this.checkKuCoin.bind(this),
      getPreferredPair: (symbol: string) => `${symbol}-USDT`
    },
    {
      name: 'bybit',
      checkAvailability: this.checkBybit.bind(this),
      getPreferredPair: (symbol: string) => `${symbol}USDT`
    },
    {
      name: 'dexscreener',
      checkAvailability: this.checkDEXScreener.bind(this),
      getPreferredPair: (symbol: string) => `${symbol}/USDC`
    }
  ];

  /**
   * Check Binance availability using their public API
   */
  private async checkBinance(symbol: string): Promise<{ available: boolean; tradingPair?: string }> {
    try {
      const tradingPair = `${symbol}USDT`;
      const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${tradingPair}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return { available: !!data.symbol, tradingPair };
      }
      
      // Try with BTC pair if USDT fails
      const btcPair = `${symbol}BTC`;
      const btcResponse = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${btcPair}`);
      if (btcResponse.ok) {
        const btcData = await btcResponse.json();
        return { available: !!btcData.symbol, tradingPair: btcPair };
      }
      
      return { available: false };
    } catch (error) {
      console.error(`Error checking Binance for ${symbol}:`, error);
      return { available: false };
    }
  }

  /**
   * Check Coinbase availability using their public API
   */
  private async checkCoinbase(symbol: string): Promise<{ available: boolean; tradingPair?: string }> {
    try {
      const tradingPair = `${symbol}-USD`;
      const response = await fetch(`https://api.exchange.coinbase.com/products/${tradingPair}/ticker`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        return { available: !!data.price, tradingPair };
      }
      
      // Try with USDC pair if USD fails
      const usdcPair = `${symbol}-USDC`;
      const usdcResponse = await fetch(`https://api.exchange.coinbase.com/products/${usdcPair}/ticker`);
      if (usdcResponse.ok) {
        const usdcData = await usdcResponse.json();
        return { available: !!usdcData.price, tradingPair: usdcPair };
      }
      
      return { available: false };
    } catch (error) {
      console.error(`Error checking Coinbase for ${symbol}:`, error);
      return { available: false };
    }
  }

  /**
   * Check KuCoin availability using their public API
   */
  private async checkKuCoin(symbol: string): Promise<{ available: boolean; tradingPair?: string }> {
    try {
      const tradingPair = `${symbol}-USDT`;
      const response = await fetch(`https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${tradingPair}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.code === '200000' && data.data?.price) {
          return { available: true, tradingPair };
        }
      }
      
      // Try with BTC pair if USDT fails
      const btcPair = `${symbol}-BTC`;
      const btcResponse = await fetch(`https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${btcPair}`);
      if (btcResponse.ok) {
        const btcData = await btcResponse.json();
        if (btcData.code === '200000' && btcData.data?.price) {
          return { available: true, tradingPair: btcPair };
        }
      }
      
      return { available: false };
    } catch (error) {
      console.error(`Error checking KuCoin for ${symbol}:`, error);
      return { available: false };
    }
  }

  /**
   * Check Bybit availability using their public API
   */
  private async checkBybit(symbol: string): Promise<{ available: boolean; tradingPair?: string }> {
    try {
      const tradingPair = `${symbol}USDT`;
      const response = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${tradingPair}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.retCode === 0 && data.result?.list && data.result.list.length > 0) {
          return { available: true, tradingPair };
        }
      }
      
      // Try with BTC pair if USDT fails
      const btcPair = `${symbol}BTC`;
      const btcResponse = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${btcPair}`);
      if (btcResponse.ok) {
        const btcData = await btcResponse.json();
        if (btcData.retCode === 0 && btcData.result?.list && btcData.result.list.length > 0) {
          return { available: true, tradingPair: btcPair };
        }
      }
      
      return { available: false };
    } catch (error) {
      console.error(`Error checking Bybit for ${symbol}:`, error);
      return { available: false };
    }
  }

  /**
   * Check DEXScreener for DEX availability (stablecoin pairs only)
   */
  private async checkDEXScreener(symbol: string): Promise<{ available: boolean; tradingPair?: string }> {
    try {
      // DEXScreener search API to find if token exists on any DEX
      const response = await fetch(`https://api.dexscreener.com/latest/dex/search/?q=${symbol}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const pairs = data.pairs || [];
        
        // List of stablecoins to look for
        const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'FRAX', 'TUSD'];
        
        // Look for pairs with stablecoins and reasonable liquidity
        const validPair = pairs.find((pair: {
          baseToken?: { symbol?: string };
          quoteToken?: { symbol?: string };
          liquidity?: { usd?: number };
          dexId?: string;
        }) => {
          const baseSymbol = pair.baseToken?.symbol?.toUpperCase();
          const quoteSymbol = pair.quoteToken?.symbol?.toUpperCase();
          const liquidity = pair.liquidity?.usd || 0;
          
          return baseSymbol === symbol.toUpperCase() &&
                 stablecoins.includes(quoteSymbol) &&
                 liquidity > 25000; // Minimum $25k liquidity for DEX pairs
        });
        
        if (validPair) {
          const tradingPair = `${validPair.baseToken.symbol}/${validPair.quoteToken.symbol}`;
          console.log(`    🎯 Found stablecoin pair: ${tradingPair} (${validPair.dexId}, $${Math.round(validPair.liquidity.usd).toLocaleString()} liquidity)`);
          return { available: true, tradingPair };
        }
        
        // Log if we found pairs but none were stablecoin pairs
        if (pairs.length > 0) {
          const nonStablePairs = pairs.filter((pair: {
            baseToken?: { symbol?: string };
            quoteToken?: { symbol?: string };
          }) => 
            pair.baseToken?.symbol?.toUpperCase() === symbol.toUpperCase()
          ).slice(0, 3);
          console.log(`    ❌ Found ${pairs.length} pairs but none with stablecoins. Examples: ${nonStablePairs.map((p) => `${p.baseToken?.symbol}/${p.quoteToken?.symbol}`).join(', ')}`);
        }
      }
      
      return { available: false };
    } catch (error) {
      console.error(`Error checking DEXScreener for ${symbol}:`, error);
      return { available: false };
    }
  }

  /**
   * Check all exchanges for a given cryptocurrency and store results
   */
  async checkAndStoreExchangeAvailability(cryptoId: string, symbol: string): Promise<ExchangeMapping[]> {
    console.log(`🔍 Checking exchange availability for ${symbol}...`);
    
    const results: ExchangeMapping[] = [];
    
    for (const exchange of this.exchanges) {
      try {
        console.log(`  Checking ${exchange.name}...`);
        const result = await exchange.checkAvailability(symbol);
        
        if (result.available && result.tradingPair) {
          // Store successful mapping
          const mapping = await this.storeExchangeMapping(
            cryptoId,
            exchange.name,
            result.tradingPair,
            true,
            'api_check'
          );
          if (mapping) results.push(mapping);
          console.log(`    ✅ Found on ${exchange.name}: ${result.tradingPair}`);
        } else {
          // Store failed mapping for cache purposes
          await this.storeExchangeMapping(
            cryptoId,
            exchange.name,
            exchange.getPreferredPair(symbol),
            false,
            'api_check'
          );
          console.log(`    ❌ Not found on ${exchange.name}`);
        }
        
        // Rate limiting - wait between API calls
        await this.delay(200);
        
      } catch (error) {
        console.error(`Error checking ${exchange.name} for ${symbol}:`, error);
      }
    }
    
    // Set the first available exchange as preferred
    if (results.length > 0) {
      await this.setPreferredExchange(cryptoId, results[0].exchange_name);
    }
    
    return results;
  }

  /**
   * Store exchange mapping in database
   */
  private async storeExchangeMapping(
    cryptoId: string,
    exchangeName: string,
    tradingPair: string,
    isAvailable: boolean,
    verificationMethod: string
  ): Promise<ExchangeMapping | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('exchange_mappings')
        .upsert({
          cryptocurrency_id: cryptoId,
          exchange_name: exchangeName,
          trading_pair: tradingPair,
          is_available: isAvailable,
          verification_method: verificationMethod,
          last_checked: new Date().toISOString()
        }, {
          onConflict: 'cryptocurrency_id,exchange_name'
        })
        .select()
        .single();

      if (error) {
        console.error(`Error storing exchange mapping for ${exchangeName}:`, error);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Error in storeExchangeMapping:`, error);
      return null;
    }
  }

  /**
   * Set preferred exchange for a cryptocurrency
   */
  private async setPreferredExchange(cryptoId: string, exchangeName: string): Promise<void> {
    try {
      // First, unset all preferred flags for this crypto
      await supabaseAdmin
        .from('exchange_mappings')
        .update({ is_preferred: false })
        .eq('cryptocurrency_id', cryptoId);

      // Then set the preferred exchange
      await supabaseAdmin
        .from('exchange_mappings')
        .update({ is_preferred: true })
        .eq('cryptocurrency_id', cryptoId)
        .eq('exchange_name', exchangeName);

    } catch (error) {
      console.error(`Error setting preferred exchange:`, error);
    }
  }

  /**
   * Get the best available exchange for a cryptocurrency
   */
  async getBestExchange(cryptoId: string, symbol: string): Promise<{ exchange: string; tradingPair: string } | null> {
    try {
      // First check database for cached results
      const { data: cachedMappings, error } = await supabaseAdmin
        .from('exchange_mappings')
        .select('*')
        .eq('cryptocurrency_id', cryptoId)
        .eq('is_available', true)
        .order('is_preferred', { ascending: false })
        .order('exchange_name', { ascending: true });

      if (error) {
        console.error('Error fetching exchange mappings:', error);
        return null;
      }

      // If we have cached data less than 24 hours old, use it
      if (cachedMappings && cachedMappings.length > 0) {
        const latestCheck = new Date(cachedMappings[0].last_checked);
        const now = new Date();
        const hoursSinceCheck = (now.getTime() - latestCheck.getTime()) / (1000 * 60 * 60);

        if (hoursSinceCheck < 24) {
          const preferred = cachedMappings.find(m => m.is_preferred) || cachedMappings[0];
          return {
            exchange: preferred.exchange_name,
            tradingPair: preferred.trading_pair
          };
        }
      }

      // If no cached data or data is stale, check exchanges
      console.log(`No fresh cached data for ${symbol}, checking exchanges...`);
      const results = await this.checkAndStoreExchangeAvailability(cryptoId, symbol);
      
      if (results.length > 0) {
        return {
          exchange: results[0].exchange_name,
          tradingPair: results[0].trading_pair
        };
      }

      return null;
    } catch (error) {
      console.error(`Error getting best exchange for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get TradingView symbol format for an exchange
   */
  getTradingViewSymbol(exchange: string, tradingPair: string): string {
    // Special cases for tokens with better coverage on specific exchanges
    const upperPair = tradingPair.toUpperCase();
    
    // Extract base symbol from trading pair - handle various formats
    let baseSymbol = tradingPair.toUpperCase();
    // Remove common quote currencies
    baseSymbol = baseSymbol.replace(/[-\/]?(USD[T]?|BTC|ETH)$/i, '');
    
    
    // Special exchange mappings for specific tokens
    if (baseSymbol === 'AB') {
      return 'MEXC:ABUSDT';
    }
    
    if (baseSymbol === 'SKY') {
      return 'KUCOIN:SKYUSDT';
    }
    
    if (baseSymbol === 'XMR') {
      return 'CRYPTO:XMRUSD';
    }
    
    if (baseSymbol === 'TKX') {
      return 'TOKENIZE:TKXUSD';
    }
    
    if (baseSymbol === 'GT') {
      return 'CRYPTO:GTUSD';
    }
    
    if (baseSymbol === 'FTN') {
      return 'CRYPTO:FTNUSD';
    }
    
    if (baseSymbol === 'VIRTUAL') {
      return 'CRYPTO:VIRTUALUSD';
    }
    
    // Dynamic gold token handling - support whichever one is currently included
    if (baseSymbol === 'PAXG') {
      return 'CRYPTO:PAXGUSD';
    }
    
    if (baseSymbol === 'XAUT') {
      return 'CRYPTO:XAUTUSD';
    }
    
    if (baseSymbol === 'BTT') {
      return 'CRYPTO:BTTUSD';
    }
    
    if (baseSymbol === 'CORE') {
      return 'BYBIT:COREUSDT';
    }
    
    if (baseSymbol === 'ONDO') {
      return 'CRYPTO:ONDOUSD';
    }
    
    if (upperPair.startsWith('PI')) {
      return 'OKX:PIUSD';
    }
    
    if (upperPair.startsWith('LEO')) {
      return 'CRYPTO:LEOUSD';
    }
    
    if (upperPair.startsWith('STETH')) {
      return 'CRYPTO:STETHUSD';
    }
    
    if (upperPair.startsWith('FARTCOIN')) {
      return 'CRYPTO:FARTCOINUSD';
    }
    
    if (upperPair.startsWith('RETH')) {
      return 'CRYPTO:RETHRUSD';
    }
    
    switch (exchange.toLowerCase()) {
      case 'binance':
        return `BINANCE:${tradingPair}`;
      case 'coinbase':
        return `COINBASE:${tradingPair.replace('-', '')}`;
      case 'kucoin':
        return `KUCOIN:${tradingPair.replace('-', '')}`;
      case 'bybit':
        return `BYBIT:${tradingPair}`;
      case 'dexscreener': {
        // For DEX tokens, use CRYPTO feed for price data (not CRYPTOCAP which shows market cap)
        const baseSymbol = tradingPair.split('/')[0];
        return `CRYPTO:${baseSymbol}USD`;
      }
      default:
        // Use CRYPTO feed as universal fallback instead of Binance
        const symbol = tradingPair.split(/[-\/]?USD[T]?$/i)[0].toUpperCase();
        return `CRYPTO:${symbol}USD`;
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new ExchangeChecker();