import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkRateLimit } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Apply rate limiting for public API
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimit = checkRateLimit(clientIP, { requests: 30, window: 60000 }); // 30 requests per minute for summary
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetTime: rateLimit.resetTime },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': rateLimit.resetTime.toString() } }
    );
  }
  try {
    // Get summary statistics
    const { data: totalCryptos } = await supabaseAdmin
      .from('cryptocurrencies')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    const { data: bmsbData } = await supabaseAdmin
      .from('bmsb_calculations')
      .select('band_health')
      .gte('calculation_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // Last 7 days

    // Count band health statuses
    const healthCounts = bmsbData?.reduce((acc, calc) => {
      acc[calc.band_health] = (acc[calc.band_health] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Get latest update timestamp
    const { data: latestUpdate } = await supabaseAdmin
      .from('bmsb_calculations')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get market cap rankings update
    const { data: latestRanking } = await supabaseAdmin
      .from('market_cap_rankings')
      .select('recorded_at')
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    const summary = {
      total_cryptocurrencies: totalCryptos?.length || 0,
      band_health_distribution: {
        healthy: healthCounts.healthy || 0,
        mixed: healthCounts.mixed || 0,
        weak: healthCounts.weak || 0,
        stablecoin: healthCounts.stablecoin || 0
      },
      system_status: {
        status: 'operational',
        last_bmsb_update: latestUpdate?.created_at || null,
        last_ranking_update: latestRanking?.recorded_at || null,
        data_freshness: latestUpdate?.created_at ? 
          Math.round((Date.now() - new Date(latestUpdate.created_at).getTime()) / (1000 * 60 * 60)) : null // hours ago
      },
      market_overview: {
        bullish_signals: healthCounts.healthy || 0,
        bearish_signals: healthCounts.weak || 0,
        mixed_signals: healthCounts.mixed || 0,
        not_applicable: healthCounts.stablecoin || 0
      }
    };

    return NextResponse.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch summary data' 
      },
      { status: 500 }
    );
  }
}