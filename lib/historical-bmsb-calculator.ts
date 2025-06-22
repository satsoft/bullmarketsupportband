import { supabaseAdmin } from './supabase';
import { coinGeckoAPI } from './coingecko';
import { BMSBResult } from './bmsb-calculator';

export class HistoricalBMSBCalculator {
  
  // Generate date strings for weekly snapshots going back in time
  static generateWeeklyDates(weeksBack: number = 25): string[] {
    const dates: string[] = [];
    const now = new Date();
    
    // Start from last Monday to ensure we get complete weeks
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    
    for (let i = 0; i < weeksBack; i++) {
      const weekDate = new Date(lastMonday);
      weekDate.setDate(lastMonday.getDate() - (i * 7));
      
      // Format as dd-mm-yyyy for CoinGecko API
      const day = weekDate.getDate().toString().padStart(2, '0');
      const month = (weekDate.getMonth() + 1).toString().padStart(2, '0');
      const year = weekDate.getFullYear();
      
      dates.push(`${day}-${month}-${year}`);
    }
    
    return dates;
  }

  // Get historical weekly price data using the history endpoint
  static async getWeeklyHistoricalData(coinId: string): Promise<Array<{date: string; price: number}>> {
    try {
      console.log(`📅 Fetching weekly historical data for ${coinId}...`);
      
      // Get 25 weeks of data (enough for 21-week EMA + buffer)
      const weeklyDates = this.generateWeeklyDates(25);
      const historicalData: Array<{date: string; price: number}> = [];
      
      // Limit to first 20 weeks to stay within rate limits for demo
      const limitedDates = weeklyDates.slice(0, 20);
      
      for (const date of limitedDates) {
        try {
          console.log(`  📊 Fetching data for ${date}...`);
          
          const data = await coinGeckoAPI.getHistoricalData(coinId, date);
          const price = data.market_data?.current_price?.usd;
          
          if (price && price > 0) {
            historicalData.push({ date, price });
          }
          
          // Rate limiting: 25 calls per minute = ~2.5 second delay
          await new Promise(resolve => setTimeout(resolve, 3000));
          
        } catch (error) {
          console.warn(`⚠️  Could not fetch data for ${coinId} on ${date}:`, error);
          continue;
        }
      }
      
      console.log(`✅ Retrieved ${historicalData.length} weekly data points for ${coinId}`);
      return historicalData.reverse(); // Reverse to get chronological order (oldest first)
      
    } catch (error) {
      console.error(`❌ Error fetching weekly data for ${coinId}:`, error);
      return [];
    }
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

  // Calculate BMSB using historical data
  static async calculateHistoricalBMSB(cryptocurrencyId: string, coingeckoId: string): Promise<BMSBResult | null> {
    try {
      console.log(`🧮 Calculating historical BMSB for ${coingeckoId}...`);
      
      // Get weekly historical data
      const weeklyData = await this.getWeeklyHistoricalData(coingeckoId);
      
      if (weeklyData.length < 15) {
        console.warn(`⚠️  Insufficient data for ${coingeckoId}: ${weeklyData.length} weeks (need 15+)`);
        return null;
      }
      
      const prices = weeklyData.map(d => d.price);
      
      // Calculate current indicators
      const sma20Week = this.calculate20WeekSMA(prices);
      const ema21Week = this.calculate21WeekEMA(prices);
      
      // Calculate previous week's indicators for trend analysis
      const previousPrices = prices.slice(0, -1);
      const sma20WeekPrevious = previousPrices.length >= 20 ? 
        this.calculate20WeekSMA(previousPrices) : sma20Week;
      const ema21WeekPrevious = previousPrices.length >= 15 ? 
        this.calculate21WeekEMA(previousPrices) : ema21Week;
      
      // Get current price
      const currentPrice = prices[prices.length - 1];
      
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

      console.log(`✅ BMSB calculated for ${coingeckoId}:`);
      console.log(`   20W SMA: $${sma20Week.toFixed(2)} (${smaTrend})`);
      console.log(`   21W EMA: $${ema21Week.toFixed(2)} (${emaTrend})`);
      console.log(`   Current: $${currentPrice.toFixed(2)} (${pricePosition})`);
      console.log(`   Health: ${bandHealth}`);

      return result;

    } catch (error) {
      console.error(`❌ Error calculating historical BMSB for ${coingeckoId}:`, error);
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

  // Calculate historical BMSB for specific cryptocurrencies
  static async calculateHistoricalBMSBForCryptos(cryptoSymbols: string[]): Promise<void> {
    try {
      console.log(`🚀 Starting historical BMSB calculations for: ${cryptoSymbols.join(', ')}`);
      
      // Get cryptocurrency data
      const { data: cryptocurrencies, error } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('id, coingecko_id, symbol, is_stablecoin')
        .in('symbol', cryptoSymbols.map(s => s.toUpperCase()))
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      console.log(`Found ${cryptocurrencies?.length || 0} cryptocurrencies to process`);

      let successCount = 0;
      let errorCount = 0;

      for (const crypto of cryptocurrencies || []) {
        try {
          if (crypto.is_stablecoin) {
            console.log(`⚪ Skipping ${crypto.symbol} - stablecoin`);
            continue;
          }

          const bmsbResult = await this.calculateHistoricalBMSB(crypto.id, crypto.coingecko_id);
          
          if (bmsbResult) {
            await this.storeBMSBCalculation(crypto.id, bmsbResult);
            successCount++;
          } else {
            console.log(`⚠️  Skipped ${crypto.symbol} - insufficient data`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing ${crypto.symbol}:`, error);
          errorCount++;
        }
      }

      console.log(`\n✅ Historical BMSB calculation completed!`);
      console.log(`   Success: ${successCount}`);
      console.log(`   Errors: ${errorCount}`);
      
    } catch (error) {
      console.error('❌ Error in calculateHistoricalBMSBForCryptos:', error);
      throw error;
    }
  }
}