#!/usr/bin/env tsx

import { supabaseAdmin } from '../lib/supabase';

async function checkMissingBMSB() {
  try {
    console.log('🔍 Checking which cryptocurrencies are missing BMSB data in top 100...\n');
    
    // Get top 100 cryptocurrencies
    const { data: top100, error } = await supabaseAdmin
      .from('cryptocurrencies')
      .select('id, symbol, name, current_rank, is_stablecoin')
      .eq('is_active', true)
      .lte('current_rank', 100)
      .order('current_rank', { ascending: true });

    if (error) throw error;

    console.log(`Found ${top100?.length} cryptocurrencies in top 100\n`);

    // Check each crypto for BMSB data
    const missing = [];
    for (const crypto of top100 || []) {
      const { data: bmsbData, error: bmsbError } = await supabaseAdmin
        .from('bmsb_calculations')
        .select('id')
        .eq('cryptocurrency_id', crypto.id)
        .limit(1);

      if (bmsbError) {
        console.error(`Error checking ${crypto.symbol}:`, bmsbError);
        continue;
      }

      if (!bmsbData || bmsbData.length === 0) {
        missing.push(crypto);
      }
    }

    if (missing.length === 0) {
      console.log('✅ All top 100 cryptocurrencies have BMSB data!');
    } else {
      console.log(`❌ Missing BMSB data for ${missing.length} cryptocurrencies:`);
      missing.forEach(crypto => {
        const type = crypto.is_stablecoin ? '(Stablecoin)' : '(Non-stablecoin)';
        console.log(`   Rank ${crypto.current_rank}: ${crypto.symbol} - ${crypto.name} ${type}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkMissingBMSB();