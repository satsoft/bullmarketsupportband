import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    
    // Get top cryptocurrencies with their latest BMSB calculations
    const { data: rankings, error } = await supabaseAdmin
      .from('cryptocurrencies')
      .select(`
        id,
        symbol,
        name,
        coingecko_id,
        current_rank,
        is_stablecoin,
        bmsb_calculations!inner (
          sma_20_week,
          ema_21_week,
          support_band_lower,
          support_band_upper,
          current_price,
          price_position,
          sma_trend,
          ema_trend,
          band_health,
          is_applicable,
          calculation_date
        )
      `)
      .eq('is_active', true)
      .order('current_rank', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    // Get current prices from the most recent daily data
    const cryptoIds = rankings?.map(r => r.id) || [];
    const { data: dailyPrices } = await supabaseAdmin
      .from('daily_prices')
      .select('cryptocurrency_id, close_price, date')
      .in('cryptocurrency_id', cryptoIds)
      .order('date', { ascending: false });

    // Create a map of latest prices
    const latestPrices = new Map();
    dailyPrices?.forEach(price => {
      if (!latestPrices.has(price.cryptocurrency_id)) {
        latestPrices.set(price.cryptocurrency_id, price.close_price);
      }
    });

    // Format the response
    const formattedRankings = rankings?.map((crypto, index) => {
      const bmsb = crypto.bmsb_calculations[0]; // Get the latest calculation
      const currentPrice = latestPrices.get(crypto.id) || bmsb?.current_price || 0;
      
      return {
        rank: crypto.current_rank || index + 1,
        cryptocurrency: {
          id: crypto.id,
          symbol: crypto.symbol,
          name: crypto.name,
          coingecko_id: crypto.coingecko_id,
          current_price: currentPrice
        },
        bmsb: bmsb ? {
          sma_20_week: bmsb.sma_20_week,
          ema_21_week: bmsb.ema_21_week,
          price_position: bmsb.price_position,
          band_health: {
            health: bmsb.band_health,
            color: getBandHealthColor(bmsb.band_health),
            description: getBandHealthDescription(bmsb.band_health, bmsb.sma_trend, bmsb.ema_trend)
          },
          trends: {
            sma_trend: bmsb.sma_trend,
            ema_trend: bmsb.ema_trend
          },
          is_applicable: bmsb.is_applicable,
          calculation_date: bmsb.calculation_date
        } : null
      };
    }) || [];

    // Sort by rank
    formattedRankings.sort((a, b) => (a.rank || 999) - (b.rank || 999));

    return NextResponse.json({
      success: true,
      data: formattedRankings,
      count: formattedRankings.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching top 100 rankings:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch top 100 rankings' 
      },
      { status: 500 }
    );
  }
}

function getBandHealthColor(health: string): string {
  switch (health) {
    case 'healthy':
      return 'green';
    case 'mixed':
      return 'yellow';
    case 'weak':
      return 'red';
    case 'stablecoin':
      return 'gray';
    default:
      return 'gray';
  }
}

function getBandHealthDescription(health: string, smaTrend: string, emaTrend: string): string {
  switch (health) {
    case 'healthy':
      return 'Both 20W SMA and 21W EMA are increasing - Strong bull market support';
    case 'mixed':
      return `${smaTrend === 'increasing' ? '20W SMA' : '21W EMA'} increasing, ${smaTrend === 'increasing' ? '21W EMA' : '20W SMA'} ${smaTrend === 'increasing' ? emaTrend : smaTrend} - Mixed signals`;
    case 'weak':
      return 'Both 20W SMA and 21W EMA are decreasing - Weakening support';
    case 'stablecoin':
      return 'Stablecoin - BMSB analysis not applicable';
    default:
      return 'Unknown band health status';
  }
}