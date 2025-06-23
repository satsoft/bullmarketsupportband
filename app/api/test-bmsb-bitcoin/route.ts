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
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    const currentDate = now.toISOString().split('T')[0];
    
    console.log('🔍 Fetching Bitcoin data for BMSB test...');
    console.log(`📅 Current UTC time: ${now.toISOString()}`);
    console.log(`📅 Current day: ${currentDay}`);
    console.log(`📅 Current date: ${currentDate}`);
    console.log('🔄 Weekly changeover analysis mode enabled');
    
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
    console.log(`📊 Date range: ${dailyPrices[0].date} to ${dailyPrices[dailyPrices.length - 1].date}`);
    
    // Check if we have today's data
    const latestDataDate = dailyPrices[dailyPrices.length - 1].date;
    const hasCurrentData = latestDataDate === currentDate;
    console.log(`📊 Latest data date: ${latestDataDate}`);
    console.log(`📊 Has current day data: ${hasCurrentData ? '✅ Yes' : '❌ No'}`);

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
    
    console.log('\n🔍 Analyzing weekly boundary data extraction...');
    console.log('📅 Looking for Monday dates (which represent previous Sunday closes):');
    console.log('📅 Also looking for actual Sunday data for direct weekly closes:');
    
    for (const dailyPrice of dailyPrices) {
      const date = new Date(dailyPrice.date + 'T00:00:00.000Z');
      const dayOfWeek = date.getUTCDay();
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      
      // Only use Sunday data as weekly closes (most accurate)
      if (dayOfWeek === 0) { // Sunday
        const weekStart = getWeekStart(date);
        const weekEnd = getWeekEnd(weekStart);
        
        console.log(`   📅 ${dailyPrice.date} (${dayName}) → Week close for ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}: $${dailyPrice.close_price.toFixed(2)}`);
        
        weeklyData.push({
          weekStart: weekStart.toISOString().split('T')[0],
          weekEnd: weekEnd.toISOString().split('T')[0],
          closingPrice: dailyPrice.close_price, // Sunday close
          isCurrentWeek: false // Completed week
        });
        
        weeklyClosingPrices.push(dailyPrice.close_price);
      }
      
      // Fallback: If this is a Monday and we don't have the previous Sunday data, use Monday as approximation
      else if (dayOfWeek === 1) { // Monday
        // Calculate the week that ended on the previous Sunday
        const previousSunday = new Date(date);
        previousSunday.setUTCDate(date.getUTCDate() - 1); // Go back to Sunday
        const weekStart = getWeekStart(previousSunday); // Get Monday of that week
        const weekEnd = getWeekEnd(weekStart);
        
        // Only use Monday data if we don't already have Sunday data for this week
        const alreadyHasSundayData = weeklyData.some(wd => 
          wd.weekStart === weekStart.toISOString().split('T')[0]
        );
        
        if (!alreadyHasSundayData) {
          console.log(`   📅 ${dailyPrice.date} (${dayName}) → Fallback week close for ${weekStart.toISOString().split('T')[0]} to ${weekEnd.toISOString().split('T')[0]}: $${dailyPrice.close_price.toFixed(2)} (no Sunday data available)`);
          
          weeklyData.push({
            weekStart: weekStart.toISOString().split('T')[0],
            weekEnd: weekEnd.toISOString().split('T')[0],
            closingPrice: dailyPrice.close_price, // Monday as fallback
            isCurrentWeek: false // Completed week
          });
          
          weeklyClosingPrices.push(dailyPrice.close_price);
        } else {
          console.log(`   📅 ${dailyPrice.date} (${dayName}) → Skipping Monday data, already have Sunday close for week ${weekStart.toISOString().split('T')[0]}`);
        }
      }
    }
    
    console.log(`\n📊 Extracted ${weeklyData.length} weekly closing prices from combined Monday/Sunday data`);
    
    // Handle the current/most recent week - need to be careful about weekly boundaries
    const lastDailyPrice = dailyPrices[dailyPrices.length - 1];
    const lastDate = new Date(lastDailyPrice.date + 'T00:00:00.000Z');
    const lastWeekStart = getWeekStart(lastDate);
    const lastWeekEnd = getWeekEnd(lastWeekStart);
    const lastDayName = lastDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
    
    console.log(`\n🔍 Analyzing current/most recent week boundary:`);
    console.log(`   📅 Last data point: ${lastDailyPrice.date} (${lastDayName}) - $${lastDailyPrice.close_price.toFixed(2)}`);
    console.log(`   📅 Last data week range: ${lastWeekStart.toISOString().split('T')[0]} to ${lastWeekEnd.toISOString().split('T')[0]}`);
    
    // Check what the actual current date/week is
    const actualCurrentDate = now.toISOString().split('T')[0];
    const actualCurrentWeekStart = getWeekStart(now);
    console.log(`   📅 Actual current date: ${actualCurrentDate} (${currentDay})`);
    console.log(`   📅 Actual current week: ${actualCurrentWeekStart.toISOString().split('T')[0]}`);
    
    // Check if we already have this week's close from Monday data
    const hasLastWeekClose = weeklyData.some(wd => 
      wd.weekStart === lastWeekStart.toISOString().split('T')[0]
    );
    
    console.log(`   📊 Last data week already closed from Monday data: ${hasLastWeekClose ? '✅ Yes' : '❌ No'}`);
    
    // Only add a weekly close if:
    // 1. We don't already have it from Monday data, AND
    // 2. The last data point is actually a Sunday (proper week close), AND
    // 3. We're not incorrectly using live prices from a new week
    if (!hasLastWeekClose && lastDate.getUTCDay() === 0) { // Only if last data is actually Sunday
      console.log(`   📅 Using legitimate Sunday close: $${lastDailyPrice.close_price.toFixed(2)}`);
      
      weeklyData.push({
        weekStart: lastWeekStart.toISOString().split('T')[0],
        weekEnd: lastWeekEnd.toISOString().split('T')[0],
        closingPrice: lastDailyPrice.close_price, // Actual Sunday close
        isCurrentWeek: false // This is a completed week
      });
      
      weeklyClosingPrices.push(lastDailyPrice.close_price);
    } else if (!hasLastWeekClose && lastDate.getUTCDay() !== 0) {
      console.log(`   ⚠️  Last data is ${lastDayName} - cannot use as weekly close`);
      console.log(`   ⚠️  Week ${lastWeekStart.toISOString().split('T')[0]} to ${lastWeekEnd.toISOString().split('T')[0]} needs proper Sunday close`);
      console.log(`   📊 Using Monday data or waiting for Sunday close for accurate weekly boundary`);
    }
    
    // Show the actual current week status
    if (actualCurrentWeekStart.toISOString().split('T')[0] !== lastWeekStart.toISOString().split('T')[0]) {
      console.log(`   🔄 We are now in a NEW WEEK starting ${actualCurrentWeekStart.toISOString().split('T')[0]}`);
      console.log(`   📊 Current price $${lastDailyPrice.close_price.toFixed(2)} is live price for new week, not a weekly close`);
    }
    
    // Sort by week start date and use ALL available weeks for maximum EMA stability
    weeklyData.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    const allWeeklyPrices = weeklyClosingPrices;

    if (allWeeklyPrices.length < 22) {
      throw new Error(`Insufficient weekly data: ${allWeeklyPrices.length}/22 weeks minimum`);
    }

    console.log(`📅 Extracted ${allWeeklyPrices.length} weeks of COMPLETED closing prices for stable EMA calculation`);
    
    // For display purposes, show the most recent completed weeks (up to 22)
    // Only show actual weekly closes, not live prices from incomplete weeks
    const displayWeeklyData = weeklyData.filter(w => !w.isCurrentWeek).slice(-22);

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

    // Current price should be the most recent COMPLETED weekly close, not live prices
    const currentPrice = allWeeklyPrices[allWeeklyPrices.length - 1];
    
    console.log(`\n📊 Using most recent COMPLETED weekly close as current price: $${currentPrice.toFixed(2)}`);
    console.log(`📊 This represents the last properly closed week, not live market prices`);

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

    // Calculate changes for weekly changeover analysis
    const smaChange = sma20Current - sma20Previous;
    const emaChange = ema21Current - ema21Previous;
    
    // Get recent 5 weekly prices for debugging
    const recent5 = allWeeklyPrices.slice(-5);

    const calculation = {
      meta: {
        currentTime: now.toISOString(),
        currentDay: currentDay,
        currentDate: currentDate,
        hasCurrentData: hasCurrentData,
        latestDataDate: latestDataDate,
        totalDailyPrices: dailyPrices.length,
        totalWeeklyPrices: allWeeklyPrices.length,
        weeklyChangeoverAnalysis: {
          smaChange: smaChange,
          emaChange: emaChange,
          smaChangePercent: ((smaChange / sma20Previous) * 100),
          emaChangePercent: ((emaChange / ema21Previous) * 100),
          largeChangesDetected: Math.abs(smaChange) > 1000 || Math.abs(emaChange) > 1000
        }
      },
      weeklyData: displayWeeklyData,
      recentWeeklyPrices: recent5,
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

    console.log('\n✅ Bitcoin BMSB test calculation completed');
    console.log(`   Using ${totalWeeks} weeks of data for stable EMA calculation`);
    console.log(`   20W SMA: $${sma20Previous.toFixed(2)} → $${sma20Current.toFixed(2)} (${smaTrend})`);
    console.log(`   21W EMA: $${ema21Previous.toFixed(2)} → $${ema21Current.toFixed(2)} (${emaTrend})`);
    console.log(`   Current: $${currentPrice.toFixed(2)} (${pricePosition})`);
    console.log(`   Support Band: $${supportBandLower.toFixed(2)} - $${supportBandUpper.toFixed(2)}`);
    console.log(`   Health: ${bandHealth}`);
    
    console.log(`\n📊 Most recent 5 weekly closes used in calculation:`);
    recent5.forEach((price, index) => {
      const weekIndex = allWeeklyPrices.length - 5 + index;
      const weekData = weeklyData[Math.min(weekIndex, weeklyData.length - 1)];
      console.log(`   Week ${weekIndex + 1}: $${price.toFixed(2)} (${weekData?.weekStart || 'N/A'})`);
    });
    
    console.log(`\n🔄 Weekly changeover impact analysis:`);
    console.log(`   20W SMA change: ${smaChange >= 0 ? '+' : ''}$${smaChange.toFixed(2)} (${((smaChange / sma20Previous) * 100).toFixed(3)}%)`);
    console.log(`   21W EMA change: ${emaChange >= 0 ? '+' : ''}$${emaChange.toFixed(2)} (${((emaChange / ema21Previous) * 100).toFixed(3)}%)`);
    
    if (Math.abs(smaChange) > 1000 || Math.abs(emaChange) > 1000) {
      console.log(`   ⚠️  Large changes detected - likely due to weekly changeover with new data`);
    }

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