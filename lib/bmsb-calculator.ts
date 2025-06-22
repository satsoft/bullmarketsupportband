import { supabaseAdmin } from './supabase';
import { coinGeckoAPI } from './coingecko';

export interface WeeklyPrice {
  week_start_date: string;
  week_end_date: string;
  open_price: number;
  high_price: number;
  low_price: number;
  close_price: number;
  volume: number;
  market_cap: number;
}

export interface BMSBResult {
  sma_20_week: number;
  ema_21_week: number;
  sma_20_week_previous: number;
  ema_21_week_previous: number;
  support_band_lower: number;
  support_band_upper: number;
  current_price: number;
  price_position: 'above_band' | 'in_band' | 'below_band';
  sma_trend: 'increasing' | 'decreasing';
  ema_trend: 'increasing' | 'decreasing';
  band_health: 'healthy' | 'weak' | 'stablecoin';
  is_applicable: boolean;
}

export class BMSBCalculator {
  
  // 20-week Simple Moving Average
  static calculate20WeekSMA(weeklyPrices: number[]): number {
    const last20Weeks = weeklyPrices.slice(-20);
    return last20Weeks.reduce((sum, price) => sum + price, 0) / 20;
  }

  // 21-week Exponential Moving Average
  static calculate21WeekEMA(weeklyPrices: number[], previousEMA?: number): number {
    const multiplier = 2 / (21 + 1); // 0.0909
    const currentPrice = weeklyPrices[weeklyPrices.length - 1];
    
    if (!previousEMA) {
      // First calculation - use SMA of first 21 weeks
      const first21Weeks = weeklyPrices.slice(0, 21);
      previousEMA = first21Weeks.reduce((sum, price) => sum + price, 0) / 21;
    }
    
    return (currentPrice - previousEMA) * multiplier + previousEMA;
  }

  // BMSB Analysis
  static analyzeBMSBPosition(currentPrice: number, sma: number, ema: number): 'above_band' | 'in_band' | 'below_band' {
    const lowerBound = Math.min(sma, ema);
    const upperBound = Math.max(sma, ema);
    
    if (currentPrice > upperBound) return "above_band";
    if (currentPrice < lowerBound) return "below_band";
    return "in_band";
  }

  // Trend Analysis
  static analyzeTrend(current: number, previous: number): 'increasing' | 'decreasing' {
    const change = current - previous;
    
    if (change > 0) return "increasing";
    return "decreasing"; // Default to decreasing if equal or decreasing
  }

  // Band Health Analysis for Visual Indicators
  static analyzeBandHealth(
    smaTrend: 'increasing' | 'decreasing', 
    emaTrend: 'increasing' | 'decreasing', 
    isStablecoinFlag: boolean = false
  ): {
    health: 'healthy' | 'weak' | 'stablecoin';
    color: string;
    description: string;
  } {
    // Handle stablecoins separately
    if (isStablecoinFlag) {
      return {
        health: "stablecoin",
        color: "gray",
        description: "Stablecoin - BMSB analysis not applicable"
      };
    }
    
    const bothIncreasing = smaTrend === "increasing" && emaTrend === "increasing";
    
    if (bothIncreasing) {
      return {
        health: "healthy",
        color: "green",
        description: "Both 20W SMA and 21W EMA are increasing - Strong bull market support"
      };
    }
    
    return {
      health: "weak",
      color: "red", 
      description: "Bull market support showing weakness - One or both indicators declining"
    };
  }

  // Convert daily OHLC data to weekly aggregates
  static convertToWeeklyData(dailyOHLC: Array<{timestamp: number; open: number; high: number; low: number; close: number}>): WeeklyPrice[] {
    if (dailyOHLC.length === 0) return [];

    // Sort by timestamp
    const sortedData = dailyOHLC.sort((a, b) => a.timestamp - b.timestamp);
    
    const weeklyData: WeeklyPrice[] = [];
    let currentWeek: typeof dailyOHLC = [];
    let currentWeekStart: Date | null = null;

    for (const day of sortedData) {
      const dayDate = new Date(day.timestamp);
      const dayOfWeek = dayDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Start a new week on Monday (dayOfWeek === 1)
      if (dayOfWeek === 1 || currentWeekStart === null) {
        // Process previous week if it exists
        if (currentWeek.length > 0 && currentWeekStart) {
          const weeklyPrice = this.aggregateWeeklyData(currentWeek, currentWeekStart);
          weeklyData.push(weeklyPrice);
        }
        
        // Start new week
        currentWeek = [day];
        currentWeekStart = new Date(dayDate);
        // Set to Monday of this week
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);
      } else {
        currentWeek.push(day);
      }
    }

    // Process the last week
    if (currentWeek.length > 0 && currentWeekStart) {
      const weeklyPrice = this.aggregateWeeklyData(currentWeek, currentWeekStart);
      weeklyData.push(weeklyPrice);
    }

    return weeklyData;
  }

  private static aggregateWeeklyData(weekData: Array<{timestamp: number; open: number; high: number; low: number; close: number}>, weekStart: Date): WeeklyPrice {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday

    const open = weekData[0].open;
    const close = weekData[weekData.length - 1].close;
    const high = Math.max(...weekData.map(d => d.high));
    const low = Math.min(...weekData.map(d => d.low));

    return {
      week_start_date: weekStart.toISOString().split('T')[0],
      week_end_date: weekEnd.toISOString().split('T')[0],
      open_price: open,
      high_price: high,
      low_price: low,
      close_price: close,
      volume: 0, // Would need volume data from CoinGecko
      market_cap: 0 // Would need market cap data
    };
  }

  // Calculate BMSB for a cryptocurrency
  static async calculateBMSB(cryptocurrencyId: string, coingeckoId: string): Promise<BMSBResult | null> {
    try {
      // Get historical OHLC data (2+ years)
      const ohlcData = await coinGeckoAPI.getOHLCData(coingeckoId, 730);
      
      if (ohlcData.length < 147) { // Need at least 21 weeks of data (21 * 7 = 147 days minimum)
        console.warn(`Insufficient data for ${coingeckoId}: ${ohlcData.length} days`);
        return null;
      }

      // Convert to weekly data
      const weeklyData = this.convertToWeeklyData(ohlcData);
      
      if (weeklyData.length < 21) {
        console.warn(`Insufficient weekly data for ${coingeckoId}: ${weeklyData.length} weeks`);
        return null;
      }

      // Get close prices for calculations
      const closePrices = weeklyData.map(w => w.close_price);
      
      // Calculate current indicators
      const sma20Week = this.calculate20WeekSMA(closePrices);
      const ema21Week = this.calculate21WeekEMA(closePrices);
      
      // Calculate previous week's indicators for trend analysis
      const previousClosePrices = closePrices.slice(0, -1);
      const sma20WeekPrevious = previousClosePrices.length >= 20 ? this.calculate20WeekSMA(previousClosePrices) : sma20Week;
      
      // For EMA, we need to calculate progressively
      let ema21WeekPrevious = ema21Week;
      if (previousClosePrices.length >= 21) {
        ema21WeekPrevious = this.calculate21WeekEMA(previousClosePrices);
      }

      // Get current price
      const currentPrice = closePrices[closePrices.length - 1];
      
      // Analyze position and trends
      const pricePosition = this.analyzeBMSBPosition(currentPrice, sma20Week, ema21Week);
      const smaTrend = this.analyzeTrend(sma20Week, sma20WeekPrevious);
      const emaTrend = this.analyzeTrend(ema21Week, ema21WeekPrevious);

      // Check if it's a stablecoin
      const { data: crypto } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('is_stablecoin')
        .eq('id', cryptocurrencyId)
        .single();

      const isStablecoin = crypto?.is_stablecoin || false;
      const bandHealthAnalysis = this.analyzeBandHealth(smaTrend, emaTrend, isStablecoin);

      return {
        sma_20_week: sma20Week,
        ema_21_week: ema21Week,
        sma_20_week_previous: sma20WeekPrevious,
        ema_21_week_previous: ema21WeekPrevious,
        support_band_lower: Math.min(sma20Week, ema21Week),
        support_band_upper: Math.max(sma20Week, ema21Week),
        current_price: currentPrice,
        price_position: pricePosition,
        sma_trend: smaTrend,
        ema_trend: emaTrend,
        band_health: bandHealthAnalysis.health,
        is_applicable: !isStablecoin
      };

    } catch (error) {
      console.error(`Error calculating BMSB for ${coingeckoId}:`, error);
      return null;
    }
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

  // Calculate BMSB for all active cryptocurrencies
  static async calculateAllBMSB(): Promise<void> {
    try {
      console.log('Starting BMSB calculations for all cryptocurrencies...');
      
      const { data: cryptocurrencies, error } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('id, coingecko_id, symbol, is_active')
        .eq('is_active', true)
        .order('current_rank', { ascending: true });

      if (error) {
        throw error;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const crypto of cryptocurrencies || []) {
        try {
          console.log(`Calculating BMSB for ${crypto.symbol}...`);
          
          const bmsbResult = await this.calculateBMSB(crypto.id, crypto.coingecko_id);
          
          if (bmsbResult) {
            await this.storeBMSBCalculation(crypto.id, bmsbResult);
            successCount++;
            console.log(`✓ BMSB calculated for ${crypto.symbol}`);
          } else {
            console.log(`⚠ Skipped ${crypto.symbol} - insufficient data`);
          }

          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.error(`✗ Error calculating BMSB for ${crypto.symbol}:`, error);
          errorCount++;
        }
      }

      console.log(`BMSB calculation completed. Success: ${successCount}, Errors: ${errorCount}`);
      
    } catch (error) {
      console.error('Error in calculateAllBMSB:', error);
      throw error;
    }
  }
}