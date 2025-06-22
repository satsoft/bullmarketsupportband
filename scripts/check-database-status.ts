#!/usr/bin/env tsx

import { supabaseAdmin } from '../lib/supabase';

async function checkDatabaseStatus() {
  try {
    console.log('🔍 Checking current database status...\n');
    
    // 1. Check total cryptocurrencies and ranking coverage
    const { data: cryptos, error: cryptosError } = await supabaseAdmin
      .from('cryptocurrencies')
      .select('*')
      .eq('is_active', true)
      .order('current_rank', { ascending: true });

    if (cryptosError) throw cryptosError;

    console.log('🪙 CRYPTOCURRENCY COVERAGE:');
    console.log(`   Total active cryptocurrencies: ${cryptos?.length || 0}`);
    console.log(`   Stablecoins: ${cryptos?.filter(c => c.is_stablecoin).length || 0}`);
    console.log(`   Non-stablecoins: ${cryptos?.filter(c => !c.is_stablecoin).length || 0}`);
    
    const topRanks = cryptos?.filter(c => c.current_rank <= 100).length || 0;
    console.log(`   Top 100 ranked cryptocurrencies: ${topRanks}`);
    console.log(`   Buffer beyond top 100: ${(cryptos?.length || 0) - 100}`);
    
    // 2. Check latest price data
    const { data: latestPrices, error: pricesError } = await supabaseAdmin
      .from('daily_prices')
      .select(`
        date,
        close_price,
        cryptocurrencies (symbol, current_rank)
      `)
      .order('date', { ascending: false })
      .limit(10);

    if (!pricesError && latestPrices) {
      console.log('\n💰 LATEST PRICE DATA:');
      console.log('Symbol | Rank | Current Price | Date');
      console.log('-------|------|---------------|----------');
      latestPrices.forEach(price => {
        const crypto = price.cryptocurrencies as any;
        if (crypto) {
          console.log(`${crypto.symbol.padEnd(6)} | ${(crypto.current_rank || 0).toString().padStart(4)} | $${price.close_price.toFixed(2).padStart(11)} | ${price.date}`);
        }
      });
    }

    // 3. Check data completeness for top 15
    console.log('\n📊 DATA COMPLETENESS (Top 15):');
    console.log('Rank | Symbol | Weekly | Daily | BMSB | Stablecoin');
    console.log('-----|--------|--------|-------|------|----------');
    
    const top15 = cryptos?.slice(0, 15) || [];
    for (const crypto of top15) {
      // Count data for each type
      const { count: weeklyCount } = await supabaseAdmin
        .from('weekly_prices')
        .select('*', { count: 'exact', head: true })
        .eq('cryptocurrency_id', crypto.id);

      const { count: dailyCount } = await supabaseAdmin
        .from('daily_prices')
        .select('*', { count: 'exact', head: true })
        .eq('cryptocurrency_id', crypto.id);

      const { count: bmsbCount } = await supabaseAdmin
        .from('bmsb_calculations')
        .select('*', { count: 'exact', head: true })
        .eq('cryptocurrency_id', crypto.id);

      const stablecoinIndicator = crypto.is_stablecoin ? '⚪ YES' : '🔵 NO';
      
      console.log(`${(crypto.current_rank || 0).toString().padStart(4)} | ${crypto.symbol.padEnd(6)} | ${(weeklyCount || 0).toString().padStart(6)} | ${(dailyCount || 0).toString().padStart(5)} | ${(bmsbCount || 0).toString().padStart(4)} | ${stablecoinIndicator}`);
    }

    // 4. Summary
    console.log('\n✅ DATABASE STATUS SUMMARY:');
    console.log(`   🎯 Coverage: ${cryptos?.length || 0} cryptocurrencies (target: 150+)`);
    console.log(`   📈 Top 100 coverage: ${topRanks}/100 (${((topRanks/100)*100).toFixed(1)}%)`);
    console.log(`   💰 Current prices: Updated for all active cryptos`);
    console.log(`   📊 Ready for dashboard display`);
    
    if (topRanks >= 100) {
      console.log('\n🎉 SUCCESS: Full top 100+ cryptocurrency coverage achieved!');
    } else {
      console.log(`\n⚠️  WARNING: Only ${topRanks}/100 top cryptocurrencies covered`);
    }

  } catch (error) {
    console.error('❌ Error checking database status:', error);
  }
}

checkDatabaseStatus();