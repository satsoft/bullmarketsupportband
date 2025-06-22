import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateAdminAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Validate admin authentication
    const isAuthorized = validateAdminAuth(request);
    
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      timestamp: new Date().toISOString(),
      authentication: isAuthorized ? '✅ Valid' : '❌ Invalid or missing',
      environment: {
        node_env: process.env.NODE_ENV,
        has_coingecko_key: !!process.env.COINGECKO_API_KEY,
        has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        has_admin_key: !!process.env.ADMIN_API_KEY,
        has_cron_secret: !!process.env.CRON_SECRET_KEY,
        rate_limit: process.env.API_RATE_LIMIT_PER_MINUTE || 'not set'
      },
      database: {
        status: 'checking...',
        cryptocurrencies_count: 0,
        recent_prices_count: 0
      }
    };

    // Test database connection
    try {
      const { count: cryptoCount } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: priceCount } = await supabaseAdmin
        .from('daily_prices')
        .select('*', { count: 'exact', head: true });

      results.database.status = '✅ Connected';
      results.database.cryptocurrencies_count = cryptoCount || 0;
      results.database.recent_prices_count = priceCount || 0;

    } catch (dbError) {
      results.database.status = `❌ Error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`;
    }

    // Test CoinGecko API key
    if (process.env.COINGECKO_API_KEY) {
      try {
        const { coinGeckoAPI } = await import('@/lib/coingecko');
        const testData = await coinGeckoAPI.getCurrentPrice(['bitcoin']);
        
        (results as Record<string, unknown>).api_test = {
          status: '✅ API Key working',
          bitcoin_price: testData.bitcoin?.usd || 'unknown'
        };
      } catch (apiError) {
        (results as Record<string, unknown>).api_test = {
          status: `❌ API Error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`
        };
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Admin system health check completed',
      results
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Allow POST requests too
export async function POST(request: NextRequest) {
  return GET(request);
}