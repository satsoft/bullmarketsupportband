import { supabaseAdmin } from './supabase';
import { coinGeckoAPI } from './coingecko';
import { BMSBResult } from './bmsb-calculator';

export class OptimizedBMSBCalculator {
  
  // Strategy 1: Use OHLC data (1 call per crypto) and convert to weekly
  static async calculateBMSBWithOHLC(cryptocurrencyId: string, coingeckoId: string): Promise<BMSBResult | null> {
    try {
      console.log(`📊 Calculating BMSB for ${coingeckoId} using OHLC data (1 API call)...`);
      
      // Get maximum available OHLC data (365 days for Demo API)
      const ohlcData = await coinGeckoAPI.getOHLCData(coingeckoId, 365);
      
      if (ohlcData.length < 147) { // Need ~21 weeks minimum (21 * 7 = 147 days)
        console.warn(`⚠️  Insufficient data for ${coingeckoId}: ${ohlcData.length} days`);
        return null;
      }
      
      // Convert daily OHLC to weekly data
      const weeklyData = this.convertToWeeklyData(ohlcData);
      
      if (weeklyData.length < 15) {
        console.warn(`⚠️  Insufficient weekly data for ${coingeckoId}: ${weeklyData.length} weeks`);
        return null;
      }
      
      // Extract closing prices for calculations
      const closePrices = weeklyData.map(w => w.close);
      
      // Calculate BMSB indicators
      const sma20Week = this.calculate20WeekSMA(closePrices);
      const ema21Week = this.calculate21WeekEMA(closePrices);
      
      // Calculate previous week's indicators for trend analysis
      const previousClosePrices = closePrices.slice(0, -1);
      const sma20WeekPrevious = previousClosePrices.length >= 20 ? 
        this.calculate20WeekSMA(previousClosePrices) : sma20Week;
      const ema21WeekPrevious = previousClosePrices.length >= 15 ? 
        this.calculate21WeekEMA(previousClosePrices) : ema21Week;
      
      // Get current price
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

  // Convert daily OHLC data to weekly aggregates (Monday-Sunday)
  static convertToWeeklyData(dailyOHLC: Array<{timestamp: number; open: number; high: number; low: number; close: number}>): Array<{
    week_start: Date;
    open: number;
    high: number;
    low: number;
    close: number;
  }> {
    if (dailyOHLC.length === 0) return [];

    // Sort by timestamp to ensure chronological order
    const sortedData = dailyOHLC.sort((a, b) => a.timestamp - b.timestamp);
    
    const weeklyData: Array<{
      week_start: Date;
      open: number;
      high: number;
      low: number;
      close: number;
    }> = [];
    
    let currentWeek: typeof dailyOHLC = [];
    let currentWeekStart: Date | null = null;

    for (const day of sortedData) {
      const dayDate = new Date(day.timestamp);
      const dayOfWeek = dayDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Start a new week on Monday (dayOfWeek === 1) or if it's the first day
      if (dayOfWeek === 1 || currentWeekStart === null) {
        // Process previous week if it exists
        if (currentWeek.length > 0 && currentWeekStart) {
          const weeklyAggregate = this.aggregateWeeklyData(currentWeek, currentWeekStart);
          weeklyData.push(weeklyAggregate);
        }
        
        // Start new week
        currentWeek = [day];
        currentWeekStart = new Date(dayDate);
        
        // Adjust to Monday of this week if not already Monday
        if (dayOfWeek !== 1) {
          const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);
        }
      } else {
        currentWeek.push(day);
      }
    }

    // Process the last week
    if (currentWeek.length > 0 && currentWeekStart) {
      const weeklyAggregate = this.aggregateWeeklyData(currentWeek, currentWeekStart);
      weeklyData.push(weeklyAggregate);
    }

    return weeklyData;
  }

  private static aggregateWeeklyData(weekData: Array<{open: number; high: number; low: number; close: number}>, weekStart: Date): {
    week_start: Date;
    open: number;
    high: number;
    low: number;
    close: number;
  } {
    const open = weekData[0].open;
    const close = weekData[weekData.length - 1].close;
    const high = Math.max(...weekData.map(d => d.high));
    const low = Math.min(...weekData.map(d => d.low));

    return {
      week_start: weekStart,
      open,
      high,
      low,
      close
    };
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

  // Calculate optimized BMSB for multiple cryptocurrencies
  static async calculateOptimizedBMSBForCryptos(cryptoSymbols: string[]): Promise<void> {
    try {
      console.log(`🚀 Starting OPTIMIZED BMSB calculations for: ${cryptoSymbols.join(', ')}`);
      console.log(`⚡ Using OHLC endpoint (1 API call per crypto)`);
      console.log(`📊 Total API calls needed: ${cryptoSymbols.length}`);
      
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

          const bmsbResult = await this.calculateBMSBWithOHLC(crypto.id, crypto.coingecko_id);
          
          if (bmsbResult) {
            await this.storeBMSBCalculation(crypto.id, bmsbResult);
            successCount++;
          } else {
            console.log(`⚠️  Skipped ${crypto.symbol} - insufficient data`);
          }

          // Rate limiting: 25 calls per minute = ~2.5 second delay
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (error) {
          console.error(`❌ Error processing ${crypto.symbol}:`, error);
          errorCount++;
        }
      }

      console.log(`\n✅ Optimized BMSB calculation completed!`);
      console.log(`   Success: ${successCount}`);
      console.log(`   Errors: ${errorCount}`);
      console.log(`   API calls used: ${successCount + errorCount}`);
      
    } catch (error) {
      console.error('❌ Error in calculateOptimizedBMSBForCryptos:', error);
      throw error;
    }
  }
}