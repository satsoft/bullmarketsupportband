import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface WeeklyData {
  weekStart: string;
  weekEnd: string;
  closingPrice: number;
  isCurrentWeek: boolean;
}

export async function GET() {
  try {
    console.log('🔍 Fetching Bitcoin data for BMSB test...');
    
    // Get Bitcoin from database
    const { data: bitcoin, error: bitcoinError } = await supabaseAdmin
      .from('cryptocurrencies')
      .select('id, symbol, name')
      .eq('symbol', 'BTC')
      .single();

    if (bitcoinError || !bitcoin) {
      throw new Error('Bitcoin not found in database');
    }

    // Get ALL available daily price data for Bitcoin (up to 365 days for maximum EMA stability)
    const { data: dailyPrices, error: priceError } = await supabaseAdmin
      .from('daily_prices')
      .select('date, close_price')
      .eq('cryptocurrency_id', bitcoin.id)
      .order('date', { ascending: true });

    if (priceError || !dailyPrices || dailyPrices.length < 150) {
      throw new Error(`Insufficient Bitcoin price data: ${dailyPrices?.length || 0} days`);
    }

    console.log(`📊 Using ${dailyPrices.length} days of Bitcoin price data`);

    // Helper function to get week start (Monday 0:00 UTC)
    function getWeekStart(date: Date): Date {
      const startOfWeek = new Date(date);
      const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysToMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // If Sunday, go back 6 days; otherwise go back (dayOfWeek - 1) days
      startOfWeek.setUTCDate(date.getUTCDate() - daysToMonday); // Go back to Monday
      startOfWeek.setUTCHours(0, 0, 0, 0);
      return startOfWeek;
    }

    // Helper function to get week end (Sunday 23:59 UTC)
    function getWeekEnd(weekStart: Date): Date {
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
      weekEnd.setUTCHours(23, 59, 59, 999);
      return weekEnd;
    }

    // Since CoinGecko gives opening prices, we need to use Monday data for Sunday closes
    const weeklyData: WeeklyData[] = [];
    const weeklyClosingPrices: number[] = [];
    
    for (const dailyPrice of dailyPrices) {
      const date = new Date(dailyPrice.date + 'T00:00:00.000Z');
      
      // If this is a Monday, the price represents the previous Sunday's close
      if (date.getUTCDay() === 1) { // Monday
        // Calculate the week that ended on the previous Sunday
        const previousSunday = new Date(date);
        previousSunday.setUTCDate(date.getUTCDate() - 1); // Go back to Sunday
        const weekStart = getWeekStart(previousSunday); // Get Monday of that week
        const weekEnd = getWeekEnd(weekStart);
        
        weeklyData.push({
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          closingPrice: dailyPrice.close_price, // Monday's price = previous Sunday's close
          isCurrentWeek: false // These are completed weeks
        });
        
        weeklyClosingPrices.push(dailyPrice.close_price);
      }
    }
    
    // Handle the current/most recent week
    const lastDailyPrice = dailyPrices[dailyPrices.length - 1];
    const lastDate = new Date(lastDailyPrice.date + 'T00:00:00.000Z');
    const lastWeekStart = getWeekStart(lastDate);
    const lastWeekEnd = getWeekEnd(lastWeekStart);
    
    // Check if we already have this week's close from Monday data
    const hasCurrentWeekClose = weeklyData.some(wd => 
      wd.weekStart === lastWeekStart.toISOString().split('T')[0]
    );
    
    if (!hasCurrentWeekClose) {
      // If the last data point is a Sunday, use it as the weekly close
      if (lastDate.getUTCDay() === 0) { // Sunday
        weeklyData.push({
          weekStart: lastWeekStart.toISOString().split('T')[0],
          weekEnd: lastWeekEnd.toISOString().split('T')[0],
          closingPrice: lastDailyPrice.close_price, // Sunday close
          isCurrentWeek: true
        });
        
        weeklyClosingPrices.push(lastDailyPrice.close_price);
      }
      // If not Sunday, we don't have a proper close for this week yet
    }
    
    // Sort by week start date and use ALL available weeks for maximum EMA stability
    weeklyData.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    const allWeeklyPrices = weeklyClosingPrices;

    if (allWeeklyPrices.length < 22) {
      throw new Error(`Insufficient weekly data: ${allWeeklyPrices.length}/22 weeks minimum`);
    }

    console.log(`📅 Extracted ${allWeeklyPrices.length} weeks of closing prices for stable EMA calculation`);
    
    // For display purposes, show the most recent 22 weeks
    const displayWeeklyData = weeklyData.slice(-22);

    // Calculate Current BMSB using rolling EMA from ALL available data
    const totalWeeks = allWeeklyPrices.length;
    const multiplier = 2 / (21 + 1); // 0.0909
    
    // 20W SMA: most recent 20 weeks
    const current20Weeks = allWeeklyPrices.slice(-20);
    const sma20Current = current20Weeks.reduce((sum, price) => sum + price, 0) / 20;
    
    // 20W SMA Previous: previous 20 weeks (excluding current week)
    const previous20Weeks = allWeeklyPrices.slice(-21, -1);
    const sma20Previous = previous20Weeks.reduce((sum, price) => sum + price, 0) / 20;
    
    // 21W EMA Current: rolling EMA using ALL available data
    let ema21Current = allWeeklyPrices[0]; // Start with earliest week
    for (let i = 1; i < allWeeklyPrices.length; i++) {
      ema21Current = (allWeeklyPrices[i] * multiplier) + (ema21Current * (1 - multiplier));
    }
    
    // 21W EMA Previous: rolling EMA excluding the most recent week
    let ema21Previous = allWeeklyPrices[0]; // Start with earliest week
    const previousWeeksData = allWeeklyPrices.slice(0, -1); // Exclude most recent week
    for (let i = 1; i < previousWeeksData.length; i++) {
      ema21Previous = (previousWeeksData[i] * multiplier) + (ema21Previous * (1 - multiplier));
    }

    // Current price (most recent)
    const currentPrice = allWeeklyPrices[allWeeklyPrices.length - 1];

    // Determine trends
    const smaTrend = sma20Current > sma20Previous ? 'increasing' : 'decreasing';
    const emaTrend = ema21Current > ema21Previous ? 'increasing' : 'decreasing';

    // Calculate support band
    const supportBandLower = Math.min(sma20Current, ema21Current);
    const supportBandUpper = Math.max(sma20Current, ema21Current);

    // Determine price position
    let pricePosition: 'above_band' | 'in_band' | 'below_band';
    if (currentPrice > supportBandUpper) {
      pricePosition = 'above_band';
    } else if (currentPrice < supportBandLower) {
      pricePosition = 'below_band';
    } else {
      pricePosition = 'in_band';
    }

    // Determine band health
    const bandHealth = (smaTrend === 'increasing' && emaTrend === 'increasing') ? 'healthy' : 'weak';

    const calculation = {
      weeklyData: displayWeeklyData,
      sma20Previous,
      ema21Previous,
      sma20Current,
      ema21Current,
      currentPrice,
      smaTrend,
      emaTrend,
      supportBandLower,
      supportBandUpper,
      pricePosition,
      bandHealth
    };

    console.log('✅ Bitcoin BMSB test calculation completed');
    console.log(`   Using ${totalWeeks} weeks of data for stable EMA calculation`);
    console.log(`   20W SMA: $${sma20Previous.toFixed(2)} → $${sma20Current.toFixed(2)} (${smaTrend})`);
    console.log(`   21W EMA: $${ema21Previous.toFixed(2)} → $${ema21Current.toFixed(2)} (${emaTrend})`);
    console.log(`   Current: $${currentPrice.toFixed(2)} (${pricePosition})`);
    console.log(`   Health: ${bandHealth}`);

    return NextResponse.json({
      success: true,
      calculation
    });

  } catch (error) {
    console.error('❌ Error in Bitcoin BMSB test:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}