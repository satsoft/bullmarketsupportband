#!/usr/bin/env tsx

import { supabaseAdmin } from '../lib/supabase';
import { coinGeckoAPI } from '../lib/coingecko';

async function backfillYesterdayData() {
  try {
    // Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    console.log(`🔄 Backfilling data for ${yesterdayStr}...`);
    
    // Get all active cryptocurrencies
    const { data: cryptocurrencies, error } = await supabaseAdmin
      .from('cryptocurrencies')
      .select('id, coingecko_id, symbol')
      .eq('is_active', true)
      .order('current_rank', { ascending: true });

    if (error) {
      throw error;
    }

    console.log(`Found ${cryptocurrencies?.length || 0} cryptocurrencies to backfill`);

    let totalBackfilled = 0;
    const batchSize = 10; // Smaller batches for historical data to avoid rate limits
    
    for (let i = 0; i < (cryptocurrencies?.length || 0); i += batchSize) {
      const batch = cryptocurrencies!.slice(i, i + batchSize);
      
      console.log(`\n📊 Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil((cryptocurrencies?.length || 0)/batchSize)}...`);
      
      for (const crypto of batch) {
        try {
          // Check if we already have data for yesterday
          const { data: existingData } = await supabaseAdmin
            .from('daily_prices')
            .select('id')
            .eq('cryptocurrency_id', crypto.id)
            .eq('date', yesterdayStr)
            .single();
            
          if (existingData) {
            console.log(`   ✅ ${crypto.symbol} already has data for ${yesterdayStr}`);
            continue;
          }
          
          // Fetch historical data for yesterday
          console.log(`   🔄 Fetching ${crypto.symbol} data for ${yesterdayStr}...`);
          
          // Format date for CoinGecko API (dd-mm-yyyy)
          const [year, month, day] = yesterdayStr.split('-');
          const coinGeckoDate = `${day}-${month}-${year}`;
          
          const historicalData = await fetch(
            `https://api.coingecko.com/api/v3/coins/${crypto.coingecko_id}/history?date=${coinGeckoDate}`,
            {
              headers: {
                'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || ''
              }
            }
          );
          
          if (!historicalData.ok) {
            console.log(`   ⚠️  Failed to fetch ${crypto.symbol}: ${historicalData.status}`);
            continue;
          }
          
          const data = await historicalData.json();
          const price = data.market_data?.current_price?.usd;
          
          if (!price) {
            console.log(`   ⚠️  No price data for ${crypto.symbol} on ${yesterdayStr}`);
            continue;
          }
          
          // Insert the historical data
          const { error: insertError } = await supabaseAdmin
            .from('daily_prices')
            .insert({
              cryptocurrency_id: crypto.id,
              date: yesterdayStr,
              open_price: price,
              high_price: price,
              low_price: price,
              close_price: price,
              volume: 0,
              market_cap: 0
            });
            
          if (insertError) {
            console.log(`   ❌ Error inserting ${crypto.symbol}: ${insertError.message}`);
          } else {
            console.log(`   ✅ ${crypto.symbol}: $${price.toFixed(2)}`);
            totalBackfilled++;
          }
          
          // Rate limiting - wait between API calls
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.log(`   ❌ Error processing ${crypto.symbol}:`, error);
        }
      }
    }
    
    console.log(`\n✅ Backfill completed! Updated ${totalBackfilled} cryptocurrencies for ${yesterdayStr}`);
    
  } catch (error) {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  backfillYesterdayData();
}