import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Get the latest BMSB calculation for this cryptocurrency
    const { data: bmsbData, error: bmsbError } = await supabaseAdmin
      .from('bmsb_calculations')
      .select(`
        *,
        cryptocurrencies (
          id,
          symbol,
          name,
          coingecko_id,
          current_rank,
          is_stablecoin
        )
      `)
      .eq('cryptocurrency_id', id)
      .order('calculation_date', { ascending: false })
      .limit(1)
      .single();

    if (bmsbError && bmsbError.code !== 'PGRST116') {
      throw bmsbError;
    }

    if (!bmsbData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'BMSB data not found for this cryptocurrency' 
        },
        { status: 404 }
      );
    }

    // Format the response
    const response = {
      cryptocurrency: bmsbData.cryptocurrencies,
      bmsb: {
        sma_20_week: bmsbData.sma_20_week,
        ema_21_week: bmsbData.ema_21_week,
        support_band_lower: bmsbData.support_band_lower,
        support_band_upper: bmsbData.support_band_upper,
        current_price: bmsbData.current_price,
        price_position: bmsbData.price_position,
        trends: {
          sma_trend: bmsbData.sma_trend,
          ema_trend: bmsbData.ema_trend
        },
        band_health: {
          health: bmsbData.band_health,
          color: bmsbData.band_health === 'healthy' ? 'green' : 
                 bmsbData.band_health === 'mixed' ? 'yellow' :
                 bmsbData.band_health === 'stablecoin' ? 'gray' : 'red',
          description: this.getBandHealthDescription(bmsbData.band_health, bmsbData.sma_trend, bmsbData.ema_trend)
        },
        is_applicable: bmsbData.is_applicable,
        calculation_date: bmsbData.calculation_date,
        last_updated: bmsbData.created_at
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('Error fetching BMSB data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch BMSB data' 
      },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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