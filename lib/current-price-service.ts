import { supabaseAdmin } from './supabase';
import { coinGeckoAPI } from './coingecko';

export class CurrentPriceService {
  
  // Update current prices for TOP 100 dashboard cryptocurrencies only
  static async updateDashboardPrices(): Promise<void> {
    try {
      console.log('🔄 Updating prices for TOP 100 dashboard cryptocurrencies only...');
      
      // Get only the cryptocurrencies that would appear on our dashboard
      // This matches the logic from our BMSB API
      const forceIncludeTokens: string[] = []; // Currently none - all tokens must have sufficient data
      
      const { data: eligibleCryptos, error } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('id, coingecko_id, symbol, current_rank, is_stablecoin')
        .eq('is_active', true)
        .order('current_rank', { ascending: true })
        .limit(175); // Get top 175 to filter down to ~100

      if (error) {
        throw error;
      }

      // Filter to eligible tokens (same logic as BMSB API)
      const { shouldExcludeToken } = await import('./token-filters');
      const dashboardCryptos = eligibleCryptos?.filter(crypto => {
        // Force include certain tokens
        if (forceIncludeTokens.includes(crypto.symbol)) {
          return true;
        }
        
        // Apply exclusion filters
        const exclusion = shouldExcludeToken({
          symbol: crypto.symbol,
          name: '', // We don't have name here, but symbol is usually enough
          is_stablecoin: crypto.is_stablecoin
        });
        
        return !exclusion.exclude;
      }).slice(0, 100) || []; // Take top 100 eligible

      console.log(`Found ${dashboardCryptos.length} dashboard cryptocurrencies to update`);

      // Get current prices for these cryptocurrencies only
      const coinIds = dashboardCryptos.map(crypto => crypto.coingecko_id);
      const priceData = await coinGeckoAPI.getCurrentPrice(coinIds);
      
      console.log(`Retrieved prices for ${Object.keys(priceData).length} cryptocurrencies`);

      let totalUpdated = 0;
      const today = new Date().toISOString().split('T')[0];

      // Update daily_prices table with current prices
      for (const crypto of dashboardCryptos) {
        const priceInfo = priceData[crypto.coingecko_id];
        
        if (priceInfo && priceInfo.usd) {
          const currentPrice = priceInfo.usd;
          
          // Upsert into daily_prices table
          const { error: dailyError } = await supabaseAdmin
            .from('daily_prices')
            .upsert({
              cryptocurrency_id: crypto.id,
              date: today,
              open_price: currentPrice,
              high_price: currentPrice,
              low_price: currentPrice,
              close_price: currentPrice,
              volume: 0, // Volume not available from simple/price endpoint
              market_cap: 0 // Market cap not available from simple/price endpoint
            }, {
              onConflict: 'cryptocurrency_id,date'
            });

          if (dailyError) {
            console.error(`   ❌ Error updating ${crypto.symbol}:`, dailyError);
          } else {
            totalUpdated++;
            console.log(`   ✅ ${crypto.symbol} (#${crypto.current_rank}): $${currentPrice.toFixed(6)}`);
          }
        } else {
          console.warn(`   ⚠️  No price data for ${crypto.symbol}`);
        }
      }

      console.log(`\n✅ Dashboard price update completed: ${totalUpdated}/${dashboardCryptos.length} updated`);
      
    } catch (error) {
      console.error('❌ Error updating dashboard prices:', error);
      throw error;
    }
  }
  
  // Update current prices for all active cryptocurrencies
  static async updateCurrentPrices(): Promise<void> {
    try {
      console.log('🔄 Updating current prices for all cryptocurrencies...');
      
      // Get all active cryptocurrencies with their CoinGecko IDs
      const { data: cryptocurrencies, error } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('id, coingecko_id, symbol')
        .eq('is_active', true)
        .order('current_rank', { ascending: true });

      if (error) {
        throw error;
      }

      console.log(`Found ${cryptocurrencies?.length || 0} cryptocurrencies to update`);

      // Split into batches for the /simple/price endpoint (can handle multiple at once)
      const batchSize = 100; // CoinGecko allows up to 250 IDs per request
      const batches = [];
      
      for (let i = 0; i < (cryptocurrencies?.length || 0); i += batchSize) {
        batches.push(cryptocurrencies!.slice(i, i + batchSize));
      }

      let totalUpdated = 0;
      const today = new Date().toISOString().split('T')[0];

      for (const batch of batches) {
        try {
          console.log(`\n📊 Processing batch of ${batch.length} cryptocurrencies...`);
          
          // Get current prices for this batch
          const coinIds = batch.map(crypto => crypto.coingecko_id);
          const priceData = await coinGeckoAPI.getCurrentPrice(coinIds);
          
          console.log(`   ✅ Retrieved prices for ${Object.keys(priceData).length} cryptocurrencies`);

          // Update daily_prices table with current prices
          for (const crypto of batch) {
            const priceInfo = priceData[crypto.coingecko_id];
            
            if (priceInfo && priceInfo.usd) {
              const currentPrice = priceInfo.usd;
              
              // Upsert into daily_prices table
              const { error: dailyError } = await supabaseAdmin
                .from('daily_prices')
                .upsert({
                  cryptocurrency_id: crypto.id,
                  date: today,
                  open_price: currentPrice,
                  high_price: currentPrice,
                  low_price: currentPrice,
                  close_price: currentPrice,
                  volume: 0, // Volume not available from simple/price endpoint
                  market_cap: 0 // Market cap not available from simple/price endpoint
                }, {
                  onConflict: 'cryptocurrency_id,date'
                });

              if (dailyError) {
                console.error(`   ❌ Error updating ${crypto.symbol}:`, dailyError);
              } else {
                totalUpdated++;
                console.log(`   ✅ ${crypto.symbol}: $${currentPrice.toFixed(2)}`);
              }
            } else {
              console.warn(`   ⚠️  No price data for ${crypto.symbol}`);
            }
          }

          // Rate limiting between batches
          if (batches.indexOf(batch) < batches.length - 1) {
            console.log('   ⏱️  Rate limiting delay...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
        } catch (error) {
          console.error(`❌ Error processing batch:`, error);
        }
      }

      console.log(`\n✅ Current price update completed: ${totalUpdated}/${cryptocurrencies?.length || 0} updated`);
      
    } catch (error) {
      console.error('❌ Error updating current prices:', error);
      throw error;
    }
  }

  // Get the most recent price for a cryptocurrency (from daily_prices table)
  static async getCurrentPrice(cryptocurrencyId: string): Promise<number | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('daily_prices')
        .select('close_price')
        .eq('cryptocurrency_id', cryptocurrencyId)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data?.close_price || null;
      
    } catch (error) {
      console.error('Error getting current price:', error);
      return null;
    }
  }

  // Update market data and ensure we have top 150 cryptocurrencies (to cover ranking changes)
  static async updateTop150Cryptocurrencies(): Promise<void> {
    try {
      console.log('🚀 Discovering and updating top 150 cryptocurrencies...');
      console.log('📊 This ensures we cover top 100 even with ranking changes');
      
      // Get top 150 from CoinGecko to account for ranking fluctuations
      const marketData = await coinGeckoAPI.getMarketData({
        per_page: 150,
        page: 1
      });

      console.log(`Retrieved ${marketData.length} cryptocurrencies from CoinGecko`);

      let newCryptosAdded = 0;
      let existingUpdated = 0;

      for (const crypto of marketData) {
        try {
          // Check if we already have this cryptocurrency
          const { data: existingCrypto } = await supabaseAdmin
            .from('cryptocurrencies')
            .select('id, current_rank')
            .eq('coingecko_id', crypto.id)
            .single();

          // Detect stablecoins
          const isStablecoinFlag = this.isStablecoin({
            symbol: crypto.symbol,
            name: crypto.name
          });

          if (existingCrypto) {
            // Update existing cryptocurrency
            const { error: updateError } = await supabaseAdmin
              .from('cryptocurrencies')
              .update({
                current_rank: crypto.market_cap_rank,
                is_stablecoin: isStablecoinFlag,
                updated_at: new Date().toISOString()
              })
              .eq('coingecko_id', crypto.id);

            if (updateError) {
              console.error(`Error updating ${crypto.symbol}:`, updateError);
            } else {
              existingUpdated++;
              if (existingCrypto.current_rank !== crypto.market_cap_rank) {
                console.log(`📈 ${crypto.symbol}: Rank ${existingCrypto.current_rank} → ${crypto.market_cap_rank}`);
              }
            }
          } else {
            // Add new cryptocurrency
            const { error: insertError } = await supabaseAdmin
              .from('cryptocurrencies')
              .insert({
                coingecko_id: crypto.id,
                symbol: crypto.symbol.toUpperCase(),
                name: crypto.name,
                current_rank: crypto.market_cap_rank,
                is_active: true,
                is_stablecoin: isStablecoinFlag,
                categories: []
              });

            if (insertError) {
              console.error(`Error adding ${crypto.symbol}:`, insertError);
            } else {
              newCryptosAdded++;
              console.log(`✨ NEW: ${crypto.symbol} (${crypto.name}) - Rank ${crypto.market_cap_rank}`);
            }
          }
          
        } catch (error) {
          console.error(`Error processing ${crypto.symbol}:`, error);
        }
      }

      // Record new market cap rankings
      await this.recordMarketCapRankings(marketData);

      console.log(`\n✅ Top 150 cryptocurrency update completed!`);
      console.log(`   New cryptocurrencies added: ${newCryptosAdded}`);
      console.log(`   Existing cryptocurrencies updated: ${existingUpdated}`);
      console.log(`   🎯 Now covers top 100+ with buffer for ranking changes`);
      
    } catch (error) {
      console.error('❌ Error updating top 150 cryptocurrencies:', error);
      throw error;
    }
  }

  // Record market cap rankings (helper method)
  static async recordMarketCapRankings(marketData: {id: string, market_cap_rank: number, market_cap: number}[]): Promise<void> {
    try {
      const recordedAt = new Date().toISOString();
      
      // Get cryptocurrency IDs from database
      const { data: cryptocurrencies } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('id, coingecko_id')
        .in('coingecko_id', marketData.map(crypto => crypto.id));

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

      console.log(`📊 Recorded market cap rankings for ${rankingData.length} cryptocurrencies`);
      
    } catch (error) {
      console.error('Error recording market cap rankings:', error);
    }
  }

  // Stablecoin detection
  static isStablecoin(crypto: { symbol: string; name: string }): boolean {
    const stablecoinKeywords = [
      'usd', 'usdt', 'usdc', 'busd', 'dai', 'tusd', 'pax', 'gusd', 
      'husd', 'susd', 'frax', 'fei', 'lusd', 'usdp', 'ust', 'ustc'
    ];
    
    const symbolLower = crypto.symbol.toLowerCase();
    const nameLower = crypto.name.toLowerCase();
    
    return stablecoinKeywords.some(keyword => 
      symbolLower.includes(keyword) || nameLower.includes(keyword)
    );
  }

  // Complete data refresh: update cryptocurrencies, current prices, and BMSB
  static async completeDataRefresh(): Promise<void> {
    try {
      console.log('🔄 Starting complete data refresh...');
      
      // Step 1: Update top 150 cryptocurrencies
      await this.updateTop150Cryptocurrencies();
      
      console.log('\n⏱️  Rate limiting delay before price updates...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Step 2: Update current prices
      await this.updateCurrentPrices();
      
      console.log('\n✅ Complete data refresh completed!');
      console.log('\n🎯 Next steps:');
      console.log('   1. Run historical data ingestion for new cryptocurrencies');
      console.log('   2. Update BMSB calculations');
      console.log('   3. Dashboard will show fresh data');
      
    } catch (error) {
      console.error('❌ Error in complete data refresh:', error);
      throw error;
    }
  }
}