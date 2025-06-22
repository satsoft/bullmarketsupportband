import { supabaseAdmin } from './supabase';
import { coinGeckoAPI } from './coingecko';

export interface WeeklyPriceData {
  cryptocurrency_id: string;
  week_start_date: string;
  week_end_date: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  market_cap: number;
}

export interface DailyPriceData {
  cryptocurrency_id: string;
  date: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  market_cap: number;
}

export class DataIngestionService {
  
  // Convert market chart data to weekly price records
  static convertMarketChartToWeeklyData(
    cryptocurrencyId: string,
    chartData: {
      prices: number[][];
      market_caps: number[][];
      total_volumes: number[][];
    }
  ): WeeklyPriceData[] {
    if (!chartData.prices || chartData.prices.length === 0) return [];

    // Group data by weeks (Sunday to Saturday)
    const weekGroups = new Map<string, {
      prices: number[][];
      market_caps: number[][];
      volumes: number[][];
    }>();

    // Process all data points
    for (let i = 0; i < chartData.prices.length; i++) {
      const [timestamp, price] = chartData.prices[i];
      const [, marketCap] = chartData.market_caps[i] || [timestamp, 0];
      const [, volume] = chartData.total_volumes[i] || [timestamp, 0];

      const date = new Date(timestamp);
      
      // Find the Sunday of this week
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const sunday = new Date(date);
      sunday.setDate(date.getDate() - dayOfWeek);
      sunday.setHours(0, 0, 0, 0);
      
      const weekKey = sunday.toISOString().split('T')[0];
      
      if (!weekGroups.has(weekKey)) {
        weekGroups.set(weekKey, {
          prices: [],
          market_caps: [],
          volumes: []
        });
      }
      
      const weekData = weekGroups.get(weekKey)!;
      weekData.prices.push([timestamp, price]);
      weekData.market_caps.push([timestamp, marketCap]);
      weekData.volumes.push([timestamp, volume]);
    }

    // Convert each week group to weekly aggregates
    const weeklyData: WeeklyPriceData[] = [];
    
    for (const [weekStartStr, weekData] of weekGroups) {
      if (weekData.prices.length === 0) continue;
      
      // Sort by timestamp within the week
      weekData.prices.sort((a, b) => a[0] - b[0]);
      weekData.market_caps.sort((a, b) => a[0] - b[0]);
      weekData.volumes.sort((a, b) => a[0] - b[0]);
      
      const weekStart = new Date(weekStartStr);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Saturday
      
      // Calculate OHLC from prices
      const prices = weekData.prices.map(p => p[1]);
      const open_price = prices[0];
      const close_price = prices[prices.length - 1];
      const high_price = Math.max(...prices);
      const low_price = Math.min(...prices);
      
      // Calculate averages for market cap and volume
      const market_cap = weekData.market_caps.reduce((sum, mc) => sum + mc[1], 0) / weekData.market_caps.length;
      const volume = weekData.volumes.reduce((sum, vol) => sum + vol[1], 0) / weekData.volumes.length;
      
      weeklyData.push({
        cryptocurrency_id: cryptocurrencyId,
        week_start_date: weekStart.toISOString().split('T')[0],
        week_end_date: weekEnd.toISOString().split('T')[0],
        open_price,
        high_price,
        low_price,
        close_price,
        volume,
        market_cap
      });
    }

    return weeklyData.sort((a, b) => a.week_start_date.localeCompare(b.week_start_date));
  }

  // Convert market chart data to daily price records (deduplicated)
  static convertMarketChartToDailyData(
    cryptocurrencyId: string,
    chartData: {
      prices: number[][];
      market_caps: number[][];
      total_volumes: number[][];
    }
  ): DailyPriceData[] {
    if (!chartData.prices || chartData.prices.length === 0) return [];

    const dailyDataMap = new Map<string, DailyPriceData>();

    for (let i = 0; i < chartData.prices.length; i++) {
      const [timestamp, price] = chartData.prices[i];
      const [, marketCap] = chartData.market_caps[i] || [timestamp, 0];
      const [, volume] = chartData.total_volumes[i] || [timestamp, 0];

      const date = new Date(timestamp);
      const dateKey = date.toISOString().split('T')[0];
      
      // Only keep the latest data point for each date
      dailyDataMap.set(dateKey, {
        cryptocurrency_id: cryptocurrencyId,
        date: dateKey,
        open_price: price,
        high_price: price,
        low_price: price,
        close_price: price,
        volume,
        market_cap: marketCap
      });
    }

    return Array.from(dailyDataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  // Ingest historical data for a single cryptocurrency
  static async ingestHistoricalDataForCrypto(
    cryptocurrencyId: string, 
    coingeckoId: string, 
    symbol: string
  ): Promise<{weekly: number; daily: number}> {
    try {
      console.log(`📊 Ingesting historical data for ${symbol}...`);
      
      // Get 365 days of market chart data (maximum for free CoinGecko plan)
      const chartData = await coinGeckoAPI.getMarketChart(coingeckoId, 365);
      
      if (!chartData.prices || chartData.prices.length === 0) {
        console.warn(`⚠️  No data available for ${symbol}`);
        return {weekly: 0, daily: 0};
      }
      
      console.log(`   📈 Retrieved ${chartData.prices.length} data points`);
      
      // Convert to weekly and daily data
      const weeklyData = this.convertMarketChartToWeeklyData(cryptocurrencyId, chartData);
      const dailyData = this.convertMarketChartToDailyData(cryptocurrencyId, chartData);
      
      console.log(`   📅 Generated ${weeklyData.length} weekly and ${dailyData.length} daily records`);
      
      // Store weekly data
      let weeklyInserted = 0;
      if (weeklyData.length > 0) {
        const { error: weeklyError, count } = await supabaseAdmin
          .from('weekly_prices')
          .upsert(weeklyData, {
            onConflict: 'cryptocurrency_id,week_start_date'
          });

        if (weeklyError) {
          console.error(`❌ Error storing weekly data for ${symbol}:`, weeklyError);
        } else {
          weeklyInserted = count || weeklyData.length;
          console.log(`   ✅ Stored ${weeklyInserted} weekly price records`);
        }
      }
      
      // Store daily data
      let dailyInserted = 0;
      if (dailyData.length > 0) {
        const { error: dailyError, count } = await supabaseAdmin
          .from('daily_prices')
          .upsert(dailyData, {
            onConflict: 'cryptocurrency_id,date'
          });

        if (dailyError) {
          console.error(`❌ Error storing daily data for ${symbol}:`, dailyError);
        } else {
          dailyInserted = count || dailyData.length;
          console.log(`   ✅ Stored ${dailyInserted} daily price records`);
        }
      }
      
      return {weekly: weeklyInserted, daily: dailyInserted};
      
    } catch (error) {
      console.error(`❌ Error ingesting data for ${symbol}:`, error);
      return {weekly: 0, daily: 0};
    }
  }

  // Ingest historical data for ALL active cryptocurrencies
  static async ingestHistoricalDataForAllCryptos(): Promise<void> {
    try {
      console.log('🚀 Starting historical data ingestion for ALL cryptocurrencies...');
      console.log('📊 Fetching 365 days of data for maximum EMA stability\n');
      
      // Get ALL active cryptocurrencies
      const { data: cryptocurrencies, error } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('id, coingecko_id, symbol')
        .eq('is_active', true)
        .order('current_rank', { ascending: true });

      if (error) {
        throw error;
      }

      console.log(`Found ${cryptocurrencies?.length || 0} active cryptocurrencies to process\n`);

      let totalWeeklyRecords = 0;
      let totalDailyRecords = 0;
      let successCount = 0;
      let errorCount = 0;

      for (const crypto of cryptocurrencies || []) {
        try {
          const result = await this.ingestHistoricalDataForCrypto(
            crypto.id, 
            crypto.coingecko_id, 
            crypto.symbol
          );
          
          totalWeeklyRecords += result.weekly;
          totalDailyRecords += result.daily;
          successCount++;
          
          // Rate limiting: 25 calls per minute = ~2.5 second delay
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (error) {
          console.error(`❌ Error processing ${crypto.symbol}:`, error);
          errorCount++;
        }
      }

      console.log(`\n✅ Historical data ingestion completed!`);
      console.log(`   Cryptocurrencies processed: ${successCount}/${cryptocurrencies?.length || 0}`);
      console.log(`   Total weekly records: ${totalWeeklyRecords}`);
      console.log(`   Total daily records: ${totalDailyRecords}`);
      console.log(`   API calls used: ${successCount}`);
      console.log(`   Errors: ${errorCount}`);
      
      console.log('\n📊 All cryptocurrencies now have 365 days of data for:');
      console.log('   ✅ Stable 21-week EMA calculations');
      console.log('   ✅ Accurate BMSB analysis');
      console.log('   ✅ Historical trend analysis');
      console.log('   ✅ Maximum available CoinGecko free tier data');
      
    } catch (error) {
      console.error('❌ Error in historical data ingestion:', error);
      throw error;
    }
  }

  // Ingest historical data for multiple cryptocurrencies
  static async ingestHistoricalDataForCryptos(cryptoSymbols: string[]): Promise<void> {
    try {
      console.log('🚀 Starting historical data ingestion...');
      console.log(`📊 Target cryptocurrencies: ${cryptoSymbols.join(', ')}`);
      console.log(`📈 Will store weekly and daily price data for future use\n`);
      
      // Get cryptocurrency data
      const { data: cryptocurrencies, error } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('id, coingecko_id, symbol')
        .in('symbol', cryptoSymbols.map(s => s.toUpperCase()))
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      console.log(`Found ${cryptocurrencies?.length || 0} cryptocurrencies to process\n`);

      let totalWeeklyRecords = 0;
      let totalDailyRecords = 0;
      let successCount = 0;
      let errorCount = 0;

      for (const crypto of cryptocurrencies || []) {
        try {
          const result = await this.ingestHistoricalDataForCrypto(
            crypto.id, 
            crypto.coingecko_id, 
            crypto.symbol
          );
          
          totalWeeklyRecords += result.weekly;
          totalDailyRecords += result.daily;
          successCount++;
          
          // Rate limiting: 25 calls per minute = ~2.5 second delay
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (error) {
          console.error(`❌ Error processing ${crypto.symbol}:`, error);
          errorCount++;
        }
      }

      console.log(`\n✅ Historical data ingestion completed!`);
      console.log(`   Cryptocurrencies processed: ${successCount}/${cryptocurrencies?.length || 0}`);
      console.log(`   Total weekly records: ${totalWeeklyRecords}`);
      console.log(`   Total daily records: ${totalDailyRecords}`);
      console.log(`   API calls used: ${successCount}`);
      console.log(`   Errors: ${errorCount}`);
      
      console.log('\n📊 Data is now stored for:');
      console.log('   ✅ Weekly BMSB calculations');
      console.log('   ✅ Daily price updates');
      console.log('   ✅ Historical trend analysis');
      console.log('   ✅ Future backtesting');
      
    } catch (error) {
      console.error('❌ Error in historical data ingestion:', error);
      throw error;
    }
  }

  // Update daily prices for all active cryptocurrencies
  static async updateDailyPrices(): Promise<void> {
    try {
      console.log('🔄 Updating daily prices for all active cryptocurrencies...');
      
      // Get all active cryptocurrencies
      const { data: cryptocurrencies, error } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('id, coingecko_id, symbol')
        .eq('is_active', true)
        .order('current_rank', { ascending: true });

      if (error) {
        throw error;
      }

      console.log(`Updating prices for ${cryptocurrencies?.length || 0} cryptocurrencies...`);

      let successCount = 0;
      const today = new Date().toISOString().split('T')[0];

      for (const crypto of cryptocurrencies || []) {
        try {
          // Get 1 day of data (just today's price)
          const chartData = await coinGeckoAPI.getMarketChart(crypto.coingecko_id, 1);
          
          if (chartData.prices && chartData.prices.length > 0) {
            const latestData = chartData.prices[chartData.prices.length - 1];
            const latestMarketCap = chartData.market_caps?.[chartData.market_caps.length - 1]?.[1] || 0;
            const latestVolume = chartData.total_volumes?.[chartData.total_volumes.length - 1]?.[1] || 0;
            
            const [, price] = latestData;
            
            // Update daily prices table
            const { error: dailyError } = await supabaseAdmin
              .from('daily_prices')
              .upsert({
                cryptocurrency_id: crypto.id,
                date: today,
                open_price: price,
                high_price: price,
                low_price: price,
                close_price: price,
                volume: latestVolume,
                market_cap: latestMarketCap
              }, {
                onConflict: 'cryptocurrency_id,date'
              });

            if (dailyError) {
              console.error(`Error updating ${crypto.symbol}:`, dailyError);
            } else {
              successCount++;
              console.log(`✅ Updated ${crypto.symbol}: $${price.toFixed(2)}`);
            }
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 2500));
          
        } catch (error) {
          console.error(`Error updating ${crypto.symbol}:`, error);
        }
      }

      console.log(`\n✅ Daily price update completed: ${successCount}/${cryptocurrencies?.length || 0} updated`);
      
    } catch (error) {
      console.error('❌ Error updating daily prices:', error);
      throw error;
    }
  }
}