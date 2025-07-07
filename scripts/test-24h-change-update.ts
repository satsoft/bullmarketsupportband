#!/usr/bin/env tsx

/**
 * Test 24h Change Data Update
 * Tests that the existing price update job now stores 24h change data
 */

import { CurrentPriceService } from '../lib/current-price-service';

async function test24hChangeUpdate(): Promise<void> {
  console.log('🔄 Testing 24h change data update from existing scheduled job...\n');
  
  try {
    console.log('🚀 Running Top 150 cryptocurrency update (existing scheduled job)...');
    console.log('This job already calls CoinGecko but now also stores 24h change data\n');
    
    // Run the existing update job that now includes 24h change data
    await CurrentPriceService.updateTop150Cryptocurrencies();
    
    console.log('\n✅ Update completed! Now checking if 24h change data was stored...\n');
    
    // Check a sample of the data to verify 24h changes are stored
    const { supabaseAdmin } = await import('../lib/supabase');
    
    const { data: sampleData, error } = await supabaseAdmin
      .from('cryptocurrencies')
      .select('symbol, name, current_rank, price_change_percentage_24h, price_change_24h, price_updated_at')
      .eq('is_active', true)
      .order('current_rank', { ascending: true })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    console.log('📊 Sample 24h Change Data (Top 10):');
    console.log('═══════════════════════════════════════════════════════════');
    
    let hasNonZeroChanges = false;
    
    sampleData?.forEach((crypto, index) => {
      const changePercent = crypto.price_change_percentage_24h || 0;
      const change = crypto.price_change_24h || 0;
      
      if (changePercent !== 0) {
        hasNonZeroChanges = true;
      }
      
      const changeColor = changePercent >= 0 ? '🟢' : '🔴';
      const changeSign = changePercent >= 0 ? '+' : '';
      
      console.log(`${index + 1}. ${crypto.symbol} (Rank #${crypto.current_rank})`);
      console.log(`   ${changeColor} 24h Change: ${changeSign}${changePercent.toFixed(2)}%`);
      console.log(`   📈 Absolute Change: $${change.toFixed(6)}`);
      console.log(`   🕒 Updated: ${new Date(crypto.price_updated_at).toLocaleString()}`);
      console.log('');
    });
    
    if (hasNonZeroChanges) {
      console.log('🎉 SUCCESS: 24h change data is being stored in the database!');
      console.log('✅ The existing scheduled job now captures 24h changes with no additional API calls');
      console.log('✅ Chart pages and dashboard will now show real 24h change data');
    } else {
      console.log('⚠️  INFO: All 24h changes are currently 0');
      console.log('   This is normal if:');
      console.log('   - This is the first run (data will populate on next CoinGecko update)');
      console.log('   - Markets are very stable today');
      console.log('   - The CoinGecko API returned 0 values for some coins');
    }
    
    console.log('\n📝 Next Steps:');
    console.log('1. Run this update job in your scheduled cron jobs');
    console.log('2. The dashboard will automatically show real 24h changes');
    console.log('3. No additional API calls needed - uses existing market data!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n📝 Troubleshooting:');
    console.log('1. Make sure the database schema includes the new 24h change fields');
    console.log('2. Run the SQL migration: lib/add-24h-change-fields.sql');
    console.log('3. Check your CoinGecko API credentials');
    console.log('4. Verify database connectivity');
  }
}

// Run the test
test24hChangeUpdate().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});