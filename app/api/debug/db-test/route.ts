import { NextRequest, NextResponse } from 'next/server';
import { validateAdminAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  // Validate admin authentication
  if (!validateAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results: string[] = [];
    
    // Test 1: Read from cryptocurrencies table
    results.push('=== TEST 1: Reading from cryptocurrencies ===');
    const { data: cryptos, error: readError } = await supabaseAdmin
      .from('cryptocurrencies')
      .select('id, symbol, coingecko_id')
      .eq('is_active', true)
      .limit(1);
    
    if (readError) {
      results.push(`❌ Read error: ${JSON.stringify(readError)}`);
      return NextResponse.json({ success: false, results });
    }
    
    results.push(`✅ Read successful: Found ${cryptos?.length} crypto(s)`);
    if (cryptos && cryptos.length > 0) {
      results.push(`   Sample: ${cryptos[0].symbol} (${cryptos[0].id})`);
    }
    
    // Test 2: Check daily_prices table structure
    results.push('\n=== TEST 2: Checking daily_prices table ===');
    const { data: existingPrices, error: priceReadError } = await supabaseAdmin
      .from('daily_prices')
      .select('*')
      .limit(1);
    
    if (priceReadError) {
      results.push(`❌ daily_prices read error: ${JSON.stringify(priceReadError)}`);
    } else {
      results.push(`✅ daily_prices read successful: ${existingPrices?.length} records`);
      if (existingPrices && existingPrices.length > 0) {
        results.push(`   Sample record keys: ${Object.keys(existingPrices[0]).join(', ')}`);
      }
    }
    
    // Test 3: Try a simple insert with test data
    if (cryptos && cryptos.length > 0) {
      results.push('\n=== TEST 3: Testing insert into daily_prices ===');
      const testCrypto = cryptos[0];
      const today = new Date().toISOString().split('T')[0];
      const testPrice = 99999.99; // Obviously fake price for testing
      
      results.push(`Attempting to insert test data for ${testCrypto.symbol} on ${today}`);
      
      const { data: insertResult, error: insertError } = await supabaseAdmin
        .from('daily_prices')
        .insert({
          cryptocurrency_id: testCrypto.id,
          date: today,
          open_price: testPrice,
          high_price: testPrice,
          low_price: testPrice,
          close_price: testPrice,
          volume: 0,
          market_cap: 0
        })
        .select();
      
      if (insertError) {
        results.push(`❌ Insert failed: ${JSON.stringify(insertError)}`);
        results.push(`   Error code: ${insertError.code}`);
        results.push(`   Error details: ${insertError.details}`);
        results.push(`   Error hint: ${insertError.hint}`);
      } else {
        results.push(`✅ Insert successful: ${JSON.stringify(insertResult)}`);
        
        // Clean up test data
        await supabaseAdmin
          .from('daily_prices')
          .delete()
          .eq('cryptocurrency_id', testCrypto.id)
          .eq('date', today)
          .eq('close_price', testPrice);
        
        results.push(`🧹 Test data cleaned up`);
      }
    }
    
    // Test 4: Check for any database constraints
    results.push('\n=== TEST 4: Checking constraints ===');
    results.push(`Today's date: ${new Date().toISOString().split('T')[0]}`);
    results.push(`Service role connected: ${!!supabaseAdmin}`);
    
    return NextResponse.json({
      success: true,
      message: 'Database tests completed',
      results: results
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}