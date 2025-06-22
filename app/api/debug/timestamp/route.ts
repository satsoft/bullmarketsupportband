import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  // Validate admin authentication
  if (!validateAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check daily_prices for today
    const { data: dailyPrices, error } = await supabaseAdmin
      .from('daily_prices')
      .select('cryptocurrency_id, close_price, date')
      .eq('date', today)
      .limit(5);
    
    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        today: today
      });
    }
    
    const recentTime = new Date();
    recentTime.setMinutes(recentTime.getMinutes() - 2);
    
    return NextResponse.json({
      success: true,
      today: today,
      todayPricesCount: dailyPrices?.length || 0,
      sampleTodayPrices: dailyPrices?.slice(0, 3) || [],
      recentTimeCalculated: recentTime.toISOString(),
      currentTime: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}