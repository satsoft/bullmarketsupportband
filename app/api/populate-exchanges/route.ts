import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';
import exchangeChecker from '../../../lib/exchange-checker';

export async function POST() {
  try {
    console.log('🚀 Starting exchange mapping population...');
    
    // Get all active cryptocurrencies
    const { data: cryptos, error: cryptosError } = await supabaseAdmin
      .from('cryptocurrencies')
      .select('id, symbol, name')
      .eq('is_active', true)
      .order('current_rank', { ascending: true });

    if (cryptosError) {
      throw cryptosError;
    }

    if (!cryptos || cryptos.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active cryptocurrencies found'
      });
    }

    console.log(`📊 Found ${cryptos.length} cryptocurrencies to process`);
    
    let processed = 0;
    let successful = 0;
    const results: Array<{
      symbol: string;
      exchanges: number;
      mappings?: Array<{ exchange: string; pair: string }>;
      error?: string;
    }> = [];

    // Process in batches to avoid overwhelming APIs
    const batchSize = 5;
    for (let i = 0; i < cryptos.length; i += batchSize) {
      const batch = cryptos.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(cryptos.length / batchSize)}`);
      
      const batchPromises = batch.map(async (crypto) => {
        try {
          console.log(`  🔍 Processing ${crypto.symbol}...`);
          const exchangeMappings = await exchangeChecker.checkAndStoreExchangeAvailability(
            crypto.id,
            crypto.symbol
          );
          
          processed++;
          if (exchangeMappings.length > 0) {
            successful++;
            console.log(`    ✅ ${crypto.symbol}: Found on ${exchangeMappings.length} exchanges`);
          } else {
            console.log(`    ❌ ${crypto.symbol}: No exchanges found`);
          }
          
          return {
            symbol: crypto.symbol,
            exchanges: exchangeMappings.length,
            mappings: exchangeMappings.map(m => ({ exchange: m.exchange_name, pair: m.trading_pair }))
          };
        } catch (error) {
          console.error(`    💥 Error processing ${crypto.symbol}:`, error);
          processed++;
          return {
            symbol: crypto.symbol,
            exchanges: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting between batches
      if (i + batchSize < cryptos.length) {
        console.log(`  ⏳ Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`✅ Exchange mapping population completed!`);
    console.log(`📊 Processed: ${processed}/${cryptos.length}`);
    console.log(`🎯 Successful: ${successful}/${cryptos.length}`);

    return NextResponse.json({
      success: true,
      data: {
        total_processed: processed,
        total_cryptocurrencies: cryptos.length,
        successful_mappings: successful,
        failure_rate: ((processed - successful) / processed * 100).toFixed(1) + '%',
        results: results
      }
    });

  } catch (error) {
    console.error('❌ Error in exchange mapping population:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}