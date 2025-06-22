import { supabaseAdmin } from './supabase';
import { BMSBResult } from './bmsb-calculator';

export class DatabaseBMSBCalculator {
  
  // Calculate BMSB using stored daily price data (NO API calls needed)
  static async calculateBMSBFromDatabase(cryptocurrencyId: string, symbol: string): Promise<BMSBResult | null> {
    try {
      console.log(`📊 Calculating BMSB for ${symbol} using stored database data...`);
      
      // Get daily price data from database (need at least 21 weeks of same-day data)
      const { data: dailyPrices, error } = await supabaseAdmin
        .from('daily_prices')
        .select('date, close_price')
        .eq('cryptocurrency_id', cryptocurrencyId)
        .order('date', { ascending: true });

      if (error) {
        throw error;
      }

      if (!dailyPrices || dailyPrices.length < 147) {
        console.warn(`⚠️  Insufficient data for ${symbol}: ${dailyPrices?.length || 0} days (need 147+ for weekly alignment)`);
        return null;
      }
      
      // Extract closing prices and dates for calculations
      const closePrices = dailyPrices.map(d => d.close_price);
      const dates = dailyPrices.map(d => d.date);
      
      console.log(`   📅 Using ${closePrices.length} days of stored data`);
      
      // Extract ALL available weekly closing prices (up to 365 days = ~52 weeks)
      const allWeeklyPrices = this.extractWeeklyClosingPrices(closePrices, dates, 999); // Get all available weeks
      
      if (allWeeklyPrices.length < 22) {
        console.warn(`⚠️  Insufficient weekly data: ${allWeeklyPrices.length}/22 weeks minimum needed`);
        return null;
      }
      
      console.log(`   📅 Using ${allWeeklyPrices.length} weeks of data for stable EMA calculation`);
      
      // Calculate Current BMSB using rolling 21-week window from all available data
      const totalWeeks = allWeeklyPrices.length;
      const multiplier = 2 / (21 + 1); // 0.0909
      
      // 20W SMA: most recent 20 weeks
      const current20Weeks = allWeeklyPrices.slice(-20);
      const sma20Week = current20Weeks.reduce((sum, price) => sum + price, 0) / 20;
      
      // 21W EMA: Calculate rolling EMA using ALL available data, then get current 21-week period
      let ema21Week = allWeeklyPrices[0]; // Start with earliest week
      for (let i = 1; i < allWeeklyPrices.length; i++) {
        ema21Week = (allWeeklyPrices[i] * multiplier) + (ema21Week * (1 - multiplier));
      }
      
      // Calculate Previous BMSB (excluding the most recent week)
      // 20W SMA: previous 20 weeks (excluding current week)
      const previous20Weeks = allWeeklyPrices.slice(-21, -1); // Get weeks -21 to -2
      const sma20WeekPrevious = previous20Weeks.reduce((sum, price) => sum + price, 0) / 20;
      
      // 21W EMA: Calculate rolling EMA excluding the most recent week
      let ema21WeekPrevious = allWeeklyPrices[0]; // Start with earliest week
      const previousWeeksData = allWeeklyPrices.slice(0, -1); // Exclude most recent week
      for (let i = 1; i < previousWeeksData.length; i++) {
        ema21WeekPrevious = (previousWeeksData[i] * multiplier) + (ema21WeekPrevious * (1 - multiplier));
      }
      
      // Get current price (most recent week's close)
      const currentPrice = allWeeklyPrices[allWeeklyPrices.length - 1];
      
      console.log(`   📊 Weekly calculation results:`);
      console.log(`      Current 20W SMA: $${sma20Week.toFixed(2)} (most recent 20 weeks)`);
      console.log(`      Previous 20W SMA: $${sma20WeekPrevious.toFixed(2)} (previous 20 weeks)`);
      console.log(`      Current 21W EMA: $${ema21Week.toFixed(2)} (rolling EMA from ${totalWeeks} weeks)`);
      console.log(`      Previous 21W EMA: $${ema21WeekPrevious.toFixed(2)} (rolling EMA from ${totalWeeks-1} weeks)`);
      console.log(`      Current price: $${currentPrice.toFixed(2)} (most recent week close)`);
      
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
      
      // Check if it's a stablecoin (with special exception for gold tokens)
      const { data: crypto } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('symbol, is_stablecoin')
        .eq('id', cryptocurrencyId)
        .single();

      // Override stablecoin status for gold-backed tokens
      let isStablecoin = crypto?.is_stablecoin || false;
      if (crypto?.symbol === 'PAXG' || crypto?.symbol === 'XAUT') {
        isStablecoin = false; // Treat gold tokens as regular assets for BMSB analysis
      }
      
      // Determine band health (only healthy or weak, no mixed)
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

      console.log(`   ✅ BMSB calculated for ${symbol}:`);
      console.log(`      20W SMA: $${sma20Week.toFixed(2)} (${smaTrend})`);
      console.log(`      21W EMA: $${ema21Week.toFixed(2)} (${emaTrend})`);
      console.log(`      Current: $${currentPrice.toFixed(2)} (${pricePosition})`);
      console.log(`      Health: ${bandHealth}`);

      return result;

    } catch (error) {
      console.error(`❌ Error calculating BMSB for ${symbol}:`, error);
      return null;
    }
  }

  // Extract weekly closing prices using proper Monday-Sunday UTC weeks
  // NOTE: CoinGecko provides OPENING prices for each day, so we need to shift by 1 day to get closing prices
  static extractWeeklyClosingPrices(dailyPrices: number[], dailyDates: string[], weeksNeeded: number): number[] {
    if (dailyPrices.length === 0) return [];
    
    // Helper function to get the start of week (Monday 0:00 UTC) for a given date
    function getWeekStart(date: Date): Date {
      const startOfWeek = new Date(date);
      const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // If Sunday, go back 6 days; otherwise go back (dayOfWeek - 1) days
      startOfWeek.setUTCDate(date.getUTCDate() - daysToMonday); // Go back to Monday
      startOfWeek.setUTCHours(0, 0, 0, 0); // Set to 0:00 UTC
      return startOfWeek;
    }
    
    // Since CoinGecko gives opening prices, the Sunday close is actually found in Monday's data
    // We need to look for Monday data to get the previous Sunday's close
    const weeklyClosingPrices: { price: number, weekStart: Date }[] = [];
    
    for (let i = 0; i < dailyDates.length; i++) {
      const date = new Date(dailyDates[i] + 'T00:00:00.000Z');
      
      // If this is a Monday, the price represents the previous Sunday's close
      if (date.getUTCDay() === 1) { // Monday
        // Calculate the week that ended on the previous Sunday
        const previousSunday = new Date(date);
        previousSunday.setUTCDate(date.getUTCDate() - 1); // Go back to Sunday
        const weekStart = getWeekStart(previousSunday); // Get Monday of that week
        
        weeklyClosingPrices.push({
          price: dailyPrices[i], // Monday's price = previous Sunday's close
          weekStart: weekStart
        });
      }
    }
    
    // Handle the current/most recent week
    const lastDate = new Date(dailyDates[dailyDates.length - 1] + 'T00:00:00.000Z');
    const lastWeekStart = getWeekStart(lastDate);
    
    // Check if we already have this week's close from Monday data
    const hasCurrentWeekClose = weeklyClosingPrices.some(wp => 
      wp.weekStart.getTime() === lastWeekStart.getTime()
    );
    
    if (!hasCurrentWeekClose) {
      // If the last data point is a Sunday, use it as the weekly close
      if (lastDate.getUTCDay() === 0) { // Sunday
        weeklyClosingPrices.push({
          price: dailyPrices[dailyPrices.length - 1], // Sunday close
          weekStart: lastWeekStart
        });
      }
      // If not Sunday, we don't have a proper close for this week yet
    }
    
    // Sort by week start date (oldest first) and take the needed number
    weeklyClosingPrices.sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
    
    // Return the most recent 'weeksNeeded' weekly closing prices
    const recentWeeks = weeklyClosingPrices.slice(-weeksNeeded);
    
    console.log(`   📅 Extracted ${recentWeeks.length} weekly closing prices from ${weeklyClosingPrices.length} total weeks (using Monday data for Sunday closes)`);
    
    return recentWeeks.map(week => week.price);
  }

  // Calculate 20-week Simple Moving Average using weekly closing prices
  static calculate20WeekSMA(dailyPrices: number[], dailyDates: string[]): number {
    const weeklyPrices = this.extractWeeklyClosingPrices(dailyPrices, dailyDates, 20);
    
    if (weeklyPrices.length < 20) {
      console.warn(`   ⚠️  Insufficient weekly data: ${weeklyPrices.length}/20 weeks`);
      return 0;
    }
    
    const sma = weeklyPrices.reduce((sum, price) => sum + price, 0) / weeklyPrices.length;
    console.log(`   📊 20W SMA calculated from ${weeklyPrices.length} weekly closes: $${sma.toFixed(2)}`);
    return sma;
  }

  // Calculate 21-week Exponential Moving Average using weekly closing prices
  static calculate21WeekEMA(dailyPrices: number[], dailyDates: string[]): number {
    const weeklyPrices = this.extractWeeklyClosingPrices(dailyPrices, dailyDates, 21);
    
    if (weeklyPrices.length < 21) {
      console.warn(`   ⚠️  Insufficient weekly data for EMA: ${weeklyPrices.length}/21 weeks`);
      return 0; // Return 0 to indicate insufficient data (will be stored as null)
    }
    
    // 21-week EMA calculation: alpha = 2 / (21 + 1) = 0.0909
    const multiplier = 2 / (21 + 1); // 0.0909
    
    // Start with first weekly price as initial EMA
    let ema = weeklyPrices[0];
    
    // Apply EMA formula for each subsequent week: 
    // EMA = (Price * multiplier) + (Previous_EMA * (1 - multiplier))
    for (let i = 1; i < weeklyPrices.length; i++) {
      ema = (weeklyPrices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    console.log(`   📊 21W EMA calculated from ${weeklyPrices.length} weekly closes: $${ema.toFixed(2)}`);
    return ema;
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

  // Test BMSB calculations with sample data
  static testBMSBCalculations(): void {
    console.log('🧪 Testing BMSB calculations with weekly data points aligned to current day...\n');
    
    // Generate sample daily data for testing (150 days with dates)
    const testPrices: number[] = [];
    const testDates: string[] = [];
    const basePrice = 100;
    
    // Start from 150 days ago
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 149);
    
    // Generate 150 days of sample prices and dates
    for (let i = 0; i < 150; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayVariation = (Math.random() - 0.5) * 4; // ±2 variation
      const trendComponent = i * 0.05; // Slight upward trend
      testPrices.push(basePrice + trendComponent + dayVariation);
      testDates.push(currentDate.toISOString().split('T')[0]);
    }
    
    console.log(`Test data: ${testPrices.length} days of prices`);
    console.log(`Date range: ${testDates[0]} to ${testDates[testDates.length - 1]}`);
    console.log(`Latest date day of week: ${new Date(testDates[testDates.length - 1]).toLocaleDateString('en-US', { weekday: 'long' })}`);
    console.log(`Latest price: $${testPrices[testPrices.length - 1].toFixed(2)}`);
    
    // Extract weekly data points to see what we're working with
    const weeklyPrices20 = this.extractWeeklyClosingPrices(testPrices, testDates, 20);
    const weeklyPrices21 = this.extractWeeklyClosingPrices(testPrices, testDates, 21);
    
    console.log(`\n📊 Weekly data extraction:`);
    console.log(`  Found ${weeklyPrices20.length} weekly data points for 20W SMA`);
    console.log(`  Found ${weeklyPrices21.length} weekly data points for 21W EMA`);
    
    // Calculate indicators
    const sma20Week = this.calculate20WeekSMA(testPrices, testDates);
    const ema21Week = this.calculate21WeekEMA(testPrices, testDates);
    
    // Calculate previous day's indicators
    const previousDayPrices = testPrices.slice(0, -1);
    const previousDayDates = testDates.slice(0, -1);
    const sma20WeekPrevious = this.calculate20WeekSMA(previousDayPrices, previousDayDates);
    const ema21WeekPrevious = this.calculate21WeekEMA(previousDayPrices, previousDayDates);
    
    console.log(`\n📊 Current calculations:`);
    console.log(`  20W SMA (${weeklyPrices20.length} weekly points): $${sma20Week.toFixed(4)}`);
    console.log(`  21W EMA (${weeklyPrices21.length} weekly points): $${ema21Week.toFixed(4)}`);
    console.log(`\n📊 Previous day calculations:`);
    console.log(`  20W SMA: $${sma20WeekPrevious.toFixed(4)}`);
    console.log(`  21W EMA: $${ema21WeekPrevious.toFixed(4)}`);
    
    // Calculate trends
    const smaTrend = this.analyzeTrend(sma20Week, sma20WeekPrevious);
    const emaTrend = this.analyzeTrend(ema21Week, ema21WeekPrevious);
    
    console.log(`\n📈 Trends:`);
    console.log(`  20W SMA trend: ${smaTrend}`);
    console.log(`  21W EMA trend: ${emaTrend}`);
    
    // Show sample weekly prices used
    console.log(`\n🔍 Sample weekly prices used for 20W SMA:`);
    const last5Weekly = weeklyPrices20.slice(-5);
    last5Weekly.forEach((price, index) => {
      console.log(`  Week ${weeklyPrices20.length - 4 + index}: $${price.toFixed(2)}`);
    });
    
    console.log(`\n✅ Test calculations completed!\n`);
  }

  // Calculate BMSB for all cryptocurrencies with stored data (ZERO API calls)
  static async calculateAllBMSBFromDatabase(): Promise<void> {
    try {
      console.log('🚀 Starting ULTRA-FAST BMSB calculations using stored data...');
      console.log('⚡ ZERO API calls needed - using database only!');
      
      // Get all cryptocurrencies that have weekly price data
      const { data: cryptosWithData, error } = await supabaseAdmin
        .from('cryptocurrencies')
        .select(`
          id,
          symbol,
          name,
          is_stablecoin
        `)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      console.log(`Found ${cryptosWithData?.length || 0} cryptocurrencies with sufficient data\n`);

      let successCount = 0;
      let errorCount = 0;

      for (const crypto of cryptosWithData || []) {
        try {
          if (crypto.is_stablecoin) {
            console.log(`⚪ Skipping ${crypto.symbol} - stablecoin`);
            continue;
          }

          const bmsbResult = await this.calculateBMSBFromDatabase(crypto.id, crypto.symbol);
          
          if (bmsbResult) {
            await this.storeBMSBCalculation(crypto.id, bmsbResult);
            successCount++;
            
            // Show color indicator
            const healthColor = bmsbResult.band_health === 'healthy' ? '🟢' : '🔴';
            console.log(`${healthColor} ${crypto.symbol}: ${bmsbResult.band_health}\n`);
          } else {
            console.log(`⚠️  Skipped ${crypto.symbol} - insufficient data (need 147+ days)\n`);
          }
          
        } catch (error) {
          console.error(`❌ Error processing ${crypto.symbol}:`, error);
          errorCount++;
        }
      }

      console.log(`✅ ULTRA-FAST BMSB calculation completed!`);
      console.log(`   Success: ${successCount}`);
      console.log(`   Errors: ${errorCount}`);
      console.log(`   API calls used: 0 🎉`);
      console.log(`   Speed: INSTANT (no network delays)`);
      
    } catch (error) {
      console.error('❌ Error in calculateAllBMSBFromDatabase:', error);
      throw error;
    }
  }
}