import { supabaseAdmin } from './supabase';
import { coinGeckoAPI } from './coingecko';
import { BMSBResult } from './bmsb-calculator';

export class MarketChartBMSBCalculator {
  
  // Calculate BMSB using market chart data (most efficient - 1 API call per crypto)
  static async calculateBMSBWithMarketChart(cryptocurrencyId: string, coingeckoId: string): Promise<BMSBResult | null> {
    try {
      console.log(`📊 Calculating BMSB for ${coingeckoId} using market chart data (1 API call)...`);
      
      // Get 180 days of daily price data (enough for ~25 weeks)
      const chartData = await coinGeckoAPI.getMarketChart(coingeckoId, 180);
      
      if (!chartData.prices || chartData.prices.length < 147) { // Need ~21 weeks minimum
        console.warn(`⚠️  Insufficient data for ${coingeckoId}: ${chartData.prices?.length || 0} days`);
        return null;
      }
      
      // Convert timestamps and prices to a more manageable format
      const dailyPrices = chartData.prices.map(([timestamp, price]) => ({
        date: new Date(timestamp),
        price: price
      }));
      
      // Convert daily prices to weekly data (Monday-Sunday)
      const weeklyData = this.convertDailyToWeeklyPrices(dailyPrices);
      
      if (weeklyData.length < 15) {
        console.warn(`⚠️  Insufficient weekly data for ${coingeckoId}: ${weeklyData.length} weeks`);
        return null;
      }
      
      // Extract closing prices for calculations
      const closePrices = weeklyData.map(w => w.price);
      
      // Calculate BMSB indicators
      const sma20Week = this.calculate20WeekSMA(closePrices);
      const ema21Week = this.calculate21WeekEMA(closePrices);
      
      // Calculate previous week's indicators for trend analysis
      const previousClosePrices = closePrices.slice(0, -1);
      const sma20WeekPrevious = previousClosePrices.length >= 20 ? 
        this.calculate20WeekSMA(previousClosePrices) : sma20Week;
      const ema21WeekPrevious = previousClosePrices.length >= 15 ? 
        this.calculate21WeekEMA(previousClosePrices) : ema21Week;
      
      // Get current price (most recent week)
      const currentPrice = closePrices[closePrices.length - 1];
      
      // Analyze position and trends
      const lowerBound = Math.min(sma20Week, ema21Week);
      const upperBound = Math.max(sma20Week, ema21Week);
      
      let pricePosition: 'above_band' | 'in_band' | 'below_band';
      if (currentPrice > upperBound) {
        pricePosition = 'above_band';
      } else if (currentPrice < lowerBound) {
        pricePosition = 'below_band';
      } else {
        pricePosition = 'in_band';
      }
      
      const smaTrend = this.analyzeTrend(sma20Week, sma20WeekPrevious);
      const emaTrend = this.analyzeTrend(ema21Week, ema21WeekPrevious);
      
      // Check if it's a stablecoin
      const { data: crypto } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('is_stablecoin')
        .eq('id', cryptocurrencyId)
        .single();

      const isStablecoin = crypto?.is_stablecoin || false;
      
      // Determine band health
      let bandHealth: 'healthy' | 'weak' | 'stablecoin';
      if (isStablecoin) {
        bandHealth = 'stablecoin';
      } else if (smaTrend === 'increasing' && emaTrend === 'increasing') {
        bandHealth = 'healthy';
      } else {
        bandHealth = 'weak';
      }

      const result: BMSBResult = {
        sma_20_week: sma20Week,
        ema_21_week: ema21Week,
        sma_20_week_previous: sma20WeekPrevious,
        ema_21_week_previous: ema21WeekPrevious,
        support_band_lower: lowerBound,
        support_band_upper: upperBound,
        current_price: currentPrice,
        price_position: pricePosition,
        sma_trend: smaTrend,
        ema_trend: emaTrend,
        band_health: bandHealth,
        is_applicable: !isStablecoin
      };

      console.log(`✅ BMSB calculated for ${coingeckoId} (${weeklyData.length} weeks of data):`);
      console.log(`   20W SMA: $${sma20Week.toFixed(2)} (${smaTrend})`);
      console.log(`   21W EMA: $${ema21Week.toFixed(2)} (${emaTrend})`);
      console.log(`   Current: $${currentPrice.toFixed(2)} (${pricePosition})`);
      console.log(`   Health: ${bandHealth}`);

      return result;

    } catch (error) {
      console.error(`❌ Error calculating BMSB for ${coingeckoId}:`, error);
      return null;
    }
  }

  // Convert daily price data to weekly aggregates (Sunday to Saturday weeks)
  static convertDailyToWeeklyPrices(dailyPrices: Array<{date: Date; price: number}>): Array<{
    weekStart: Date;
    price: number; // Week closing price (last day of week)
  }> {
    if (dailyPrices.length === 0) return [];

    // Sort by date to ensure chronological order
    const sortedData = dailyPrices.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    const weeklyData: Array<{weekStart: Date; price: number}> = [];
    const weekGroups = new Map<string, Array<{date: Date; price: number}>>();

    // Group data by week (Sunday to Saturday)
    for (const dayData of sortedData) {
      const date = new Date(dayData.date);
      
      // Find the Sunday of this week
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const sunday = new Date(date);
      sunday.setDate(date.getDate() - dayOfWeek);
      sunday.setHours(0, 0, 0, 0);
      
      const weekKey = sunday.toISOString().split('T')[0];
      
      if (!weekGroups.has(weekKey)) {
        weekGroups.set(weekKey, []);
      }
      weekGroups.get(weekKey)!.push(dayData);
    }

    // Convert each week group to weekly data (use last price of week as closing price)
    for (const [weekKey, weekDays] of weekGroups) {
      if (weekDays.length > 0) {
        // Sort days within the week and take the last day's price as closing price
        const sortedWeekDays = weekDays.sort((a, b) => a.date.getTime() - b.date.getTime());
        const weekClosingPrice = sortedWeekDays[sortedWeekDays.length - 1].price;
        
        weeklyData.push({
          weekStart: new Date(weekKey),
          price: weekClosingPrice
        });
      }
    }

    // Sort weekly data by date
    return weeklyData.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }

  // Calculate 20-week Simple Moving Average
  static calculate20WeekSMA(prices: number[]): number {
    const last20Weeks = prices.slice(-20);
    return last20Weeks.reduce((sum, price) => sum + price, 0) / last20Weeks.length;
  }

  // Calculate 21-week Exponential Moving Average
  static calculate21WeekEMA(prices: number[], previousEMA?: number): number {
    const multiplier = 2 / (21 + 1); // 0.0909
    const currentPrice = prices[prices.length - 1];
    
    if (!previousEMA) {
      // First calculation - use SMA of available data
      const availableData = prices.slice(0, Math.min(prices.length, 21));
      previousEMA = availableData.reduce((sum, price) => sum + price, 0) / availableData.length;
    }
    
    return (currentPrice - previousEMA) * multiplier + previousEMA;
  }

  // Analyze trends
  static analyzeTrend(current: number, previous: number): 'increasing' | 'decreasing' {
    const change = current - previous;
    
    if (change > 0) return "increasing";
    return "decreasing"; // Default to decreasing if equal or decreasing
  }

  // Store BMSB calculation in database
  static async storeBMSBCalculation(cryptocurrencyId: string, calculation: BMSBResult): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('bmsb_calculations')
        .upsert({
          cryptocurrency_id: cryptocurrencyId,
          calculation_date: new Date().toISOString().split('T')[0],
          ...calculation
        }, {
          onConflict: 'cryptocurrency_id,calculation_date'
        });

      if (error) {
        throw error;
      }

    } catch (error) {
      console.error('Error storing BMSB calculation:', error);
      throw error;
    }
  }

  // Calculate market chart BMSB for multiple cryptocurrencies
  static async calculateMarketChartBMSBForCryptos(cryptoSymbols: string[]): Promise<void> {
    try {
      console.log(`🚀 Starting MARKET CHART BMSB calculations for: ${cryptoSymbols.join(', ')}`);
      console.log(`⚡ Using market_chart endpoint (MOST efficient!)`);
      console.log(`📊 Total API calls needed: ${cryptoSymbols.length}`);
      console.log(`🎯 Gets 180 days of data per call vs 20+ calls with other methods`);
      
      // Get cryptocurrency data
      const { data: cryptocurrencies, error } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('id, coingecko_id, symbol, is_stablecoin')
        .in('symbol', cryptoSymbols.map(s => s.toUpperCase()))
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      console.log(`\nFound ${cryptocurrencies?.length || 0} cryptocurrencies to process\n`);

      let successCount = 0;
      let errorCount = 0;

      for (const crypto of cryptocurrencies || []) {
        try {
          if (crypto.is_stablecoin) {
            console.log(`⚪ Skipping ${crypto.symbol} - stablecoin`);
            continue;
          }

          const bmsbResult = await this.calculateBMSBWithMarketChart(crypto.id, crypto.coingecko_id);
          
          if (bmsbResult) {
            await this.storeBMSBCalculation(crypto.id, bmsbResult);
            successCount++;
            
            // Show color indicator
            const healthColor = bmsbResult.band_health === 'healthy' ? '🟢' : '🔴';
            console.log(`${healthColor} ${crypto.symbol}: ${bmsbResult.band_health}\n`);
          } else {
            console.log(`⚠️  Skipped ${crypto.symbol} - insufficient data\n`);
          }

          // Rate limiting: 25 calls per minute = ~2.5 second delay
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (error) {
          console.error(`❌ Error processing ${crypto.symbol}:`, error);
          errorCount++;
        }
      }

      console.log(`\n✅ Market Chart BMSB calculation completed!`);
      console.log(`   Success: ${successCount}`);
      console.log(`   Errors: ${errorCount}`);
      console.log(`   API calls used: ${successCount + errorCount}`);
      console.log(`   🎉 Super efficient: 1 call per crypto vs 20+ with other methods!`);
      
    } catch (error) {
      console.error('❌ Error in calculateMarketChartBMSBForCryptos:', error);
      throw error;
    }
  }
}