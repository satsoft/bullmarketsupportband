import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  // Validate admin authentication
  if (!validateAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    
    // Capture console logs
    console.log = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      logs.push(`[LOG] ${message}`);
      originalLog(...args);
    };
    
    console.error = (...args) => {
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
      logs.push(`[ERROR] ${message}`);
      originalError(...args);
    };

    logs.push('[DEBUG] Starting debug price update...');
    
    // Test database connection first
    const { data: testQuery, error: testError } = await supabaseAdmin
      .from('cryptocurrencies')
      .select('id, coingecko_id, symbol')
      .eq('is_active', true)
      .limit(3);
    
    if (testError) {
      logs.push(`[ERROR] Database connection test failed: ${JSON.stringify(testError)}`);
      return NextResponse.json({ success: false, error: 'Database connection failed', logs });
    }
    
    logs.push(`[DEBUG] Database connection successful. Found ${testQuery?.length} test cryptocurrencies`);
    
    // Test a single price update
    if (testQuery && testQuery.length > 0) {
      const crypto = testQuery[0];
      logs.push(`[DEBUG] Testing price update for ${crypto.symbol} (${crypto.coingecko_id})`);
      
      // Get current price from CoinGecko
      const { coinGeckoAPI } = await import('@/lib/coingecko');
      const priceData = await coinGeckoAPI.getCurrentPrice([crypto.coingecko_id]);
      
      logs.push(`[DEBUG] CoinGecko response: ${JSON.stringify(priceData)}`);
      
      if (priceData[crypto.coingecko_id]?.usd) {
        const currentPrice = priceData[crypto.coingecko_id].usd;
        const today = new Date().toISOString().split('T')[0];
        
        logs.push(`[DEBUG] Attempting to upsert ${crypto.symbol} with price $${currentPrice} for date ${today}`);
        
        const { data: upsertResult, error: upsertError } = await supabaseAdmin
          .from('daily_prices')
          .upsert({
            cryptocurrency_id: crypto.id,
            date: today,
            open_price: currentPrice,
            high_price: currentPrice,
            low_price: currentPrice,
            close_price: currentPrice,
            volume: 0,
            market_cap: 0
          }, {
            onConflict: 'cryptocurrency_id,date'
          })
          .select();
        
        if (upsertError) {
          logs.push(`[ERROR] Upsert failed: ${JSON.stringify(upsertError)}`);
        } else {
          logs.push(`[SUCCESS] Upsert successful: ${JSON.stringify(upsertResult)}`);
          
          // Verify the update
          const { data: verifyData, error: verifyError } = await supabaseAdmin
            .from('daily_prices')
            .select('*')
            .eq('cryptocurrency_id', crypto.id)
            .eq('date', today);
            
          if (verifyError) {
            logs.push(`[ERROR] Verification failed: ${JSON.stringify(verifyError)}`);
          } else {
            logs.push(`[VERIFY] Found record: ${JSON.stringify(verifyData)}`);
          }
        }
      }
    }
    
    // Restore original console functions
    console.log = originalLog;
    console.error = originalError;
    
    return NextResponse.json({
      success: true,
      message: 'Debug price update completed',
      logs: logs
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs: [`[ERROR] ${error}`]
    }, { status: 500 });
  }
}