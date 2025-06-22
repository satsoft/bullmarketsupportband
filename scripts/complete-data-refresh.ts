#!/usr/bin/env tsx

import { CurrentPriceService } from '../lib/current-price-service';

async function main() {
  try {
    console.log('🔄 Starting complete data refresh...');
    console.log('🎯 This will update cryptocurrencies AND current prices');
    console.log('⚡ Comprehensive update for accurate top 100+ coverage\n');
    
    await CurrentPriceService.completeDataRefresh();
    
    console.log('\n🎉 Complete data refresh finished successfully!');
    console.log('\n🌟 Your BMSB dashboard now has:');
    console.log('   📊 Top 150 cryptocurrencies (covers top 100+ with buffer)');
    console.log('   💰 Accurate current prices');
    console.log('   📈 Updated market cap rankings');
    console.log('   ⚪ Proper stablecoin detection');
    
    console.log('\n🚀 Ready for production use!');
    console.log('   Dashboard: http://localhost:3000');
    console.log('   API: /api/bmsb-data');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error in complete data refresh:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}