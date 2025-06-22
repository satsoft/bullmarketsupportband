#!/usr/bin/env tsx

import { supabaseAdmin } from '../lib/supabase';

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  current_rank: number;
  is_stablecoin: boolean;
}

interface BMSBData {
  id: string;
  cryptocurrency_id: string;
  calculation_date: string;
  band_health: string;
  price_position: string;
  current_price: number;
  created_at: string;
}

async function checkBMSBCoverage() {
  try {
    console.log('🔍 Checking BMSB data coverage for top 100 cryptocurrencies...\n');
    
    // 1. Get top 100 cryptocurrencies (excluding stablecoins for BMSB analysis)
    const { data: top100Cryptos, error: cryptosError } = await supabaseAdmin
      .from('cryptocurrencies')
      .select('id, symbol, name, current_rank, is_stablecoin')
      .eq('is_active', true)
      .lte('current_rank', 100)
      .order('current_rank', { ascending: true }) as { data: CryptoData[] | null, error: any };

    if (cryptosError) throw cryptosError;

    if (!top100Cryptos || top100Cryptos.length === 0) {
      console.log('❌ No top 100 cryptocurrencies found in database');
      return;
    }

    console.log(`📊 Found ${top100Cryptos.length} cryptocurrencies in top 100`);
    
    // Separate stablecoins and non-stablecoins
    const nonStablecoins = top100Cryptos.filter(crypto => !crypto.is_stablecoin);
    const stablecoins = top100Cryptos.filter(crypto => crypto.is_stablecoin);
    
    console.log(`   Non-stablecoins (need BMSB): ${nonStablecoins.length}`);
    console.log(`   Stablecoins (skip BMSB): ${stablecoins.length}\n`);

    // 2. Check BMSB data completeness for non-stablecoins
    console.log('🎯 BMSB DATA COVERAGE ANALYSIS:');
    console.log('Rank | Symbol   | Name                    | BMSB Records | Latest Date | Band Health');
    console.log('-----|----------|-------------------------|--------------|-------------|-------------');
    
    let totalWithBMSB = 0;
    let totalMissingBMSB = 0;
    const missingBMSBCryptos: CryptoData[] = [];
    const bmsbSummary: Array<{crypto: CryptoData, records: number, latestDate?: string, currentBMSB?: number}> = [];

    for (const crypto of nonStablecoins) {
      // Get BMSB data for this cryptocurrency
      const { data: bmsbData, error: bmsbError, count } = await supabaseAdmin
        .from('bmsb_calculations')
        .select('calculation_date, band_health, price_position, current_price, created_at', { count: 'exact' })
        .eq('cryptocurrency_id', crypto.id)
        .order('calculation_date', { ascending: false })
        .limit(1) as { data: any[] | null, error: any, count: number | null };

      if (bmsbError) {
        console.error(`❌ Error fetching BMSB data for ${crypto.symbol}:`, bmsbError);
        continue;
      }

      const recordCount = count || 0;
      const latestBMSB = bmsbData && bmsbData.length > 0 ? bmsbData[0] : null;
      
      if (recordCount > 0) {
        totalWithBMSB++;
        bmsbSummary.push({
          crypto,
          records: recordCount,
          latestDate: latestBMSB?.calculation_date,
          currentBMSB: latestBMSB?.band_health
        });
      } else {
        totalMissingBMSB++;
        missingBMSBCryptos.push(crypto);
        bmsbSummary.push({
          crypto,
          records: 0
        });
      }

      // Format output
      const rankStr = crypto.current_rank.toString().padStart(4);
      const symbolStr = crypto.symbol.padEnd(8);
      const nameStr = crypto.name.length > 23 ? crypto.name.substring(0, 20) + '...' : crypto.name.padEnd(23);
      const recordsStr = recordCount.toString().padStart(12);
      const dateStr = latestBMSB?.calculation_date || 'N/A';
      const bmsbStr = latestBMSB?.band_health || 'N/A';
      
      console.log(`${rankStr} | ${symbolStr} | ${nameStr} | ${recordsStr} | ${dateStr.padEnd(11)} | ${bmsbStr}`);
    }

    // 3. Summary statistics
    console.log('\n📈 BMSB COVERAGE SUMMARY:');
    console.log(`   Total non-stablecoin cryptocurrencies in top 100: ${nonStablecoins.length}`);
    console.log(`   Cryptocurrencies WITH BMSB data: ${totalWithBMSB}`);
    console.log(`   Cryptocurrencies MISSING BMSB data: ${totalMissingBMSB}`);
    console.log(`   Coverage percentage: ${((totalWithBMSB / nonStablecoins.length) * 100).toFixed(1)}%`);

    // 4. Missing BMSB data details
    if (missingBMSBCryptos.length > 0) {
      console.log('\n❌ CRYPTOCURRENCIES MISSING BMSB DATA:');
      missingBMSBCryptos.forEach(crypto => {
        console.log(`   Rank ${crypto.current_rank}: ${crypto.symbol} (${crypto.name})`);
      });
    }

    // 5. Historical depth analysis for top 10
    console.log('\n📊 HISTORICAL BMSB DEPTH (Top 10 Non-Stablecoins):');
    console.log('Rank | Symbol | Total Records | Date Range');
    console.log('-----|--------|---------------|------------------');
    
    const top10NonStablecoins = nonStablecoins.slice(0, 10);
    for (const crypto of top10NonStablecoins) {
      const { data: allBMSB, error } = await supabaseAdmin
        .from('bmsb_calculations')
        .select('calculation_date')
        .eq('cryptocurrency_id', crypto.id)
        .order('calculation_date', { ascending: true });

      if (!error && allBMSB && allBMSB.length > 0) {
        const earliestDate = allBMSB[0].calculation_date;
        const latestDate = allBMSB[allBMSB.length - 1].calculation_date;
        const dateRange = earliestDate === latestDate ? earliestDate : `${earliestDate} to ${latestDate}`;
        
        console.log(`${crypto.current_rank.toString().padStart(4)} | ${crypto.symbol.padEnd(6)} | ${allBMSB.length.toString().padStart(13)} | ${dateRange}`);
      } else {
        console.log(`${crypto.current_rank.toString().padStart(4)} | ${crypto.symbol.padEnd(6)} | ${'0'.padStart(13)} | N/A`);
      }
    }

    // 6. Dashboard readiness check
    console.log('\n🎪 DASHBOARD READINESS:');
    if (totalMissingBMSB === 0) {
      console.log('✅ All top 100 non-stablecoin cryptocurrencies have BMSB data');
      console.log('✅ Dashboard should display complete BMSB information');
    } else {
      console.log(`⚠️  ${totalMissingBMSB} cryptocurrencies still missing BMSB data`);
      console.log('⚠️  Dashboard may show incomplete information for some currencies');
    }

    // 7. Final status
    console.log('\n🎯 FINAL STATUS:');
    if (totalWithBMSB === nonStablecoins.length) {
      console.log('🎉 SUCCESS: Complete BMSB coverage achieved for all top 100 non-stablecoin cryptocurrencies!');
    } else {
      console.log(`⚠️  INCOMPLETE: ${totalMissingBMSB}/${nonStablecoins.length} cryptocurrencies still need BMSB calculations`);
    }

  } catch (error) {
    console.error('❌ Error checking BMSB coverage:', error);
  }
}

checkBMSBCoverage();