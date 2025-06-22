#!/usr/bin/env tsx

import { CurrentPriceService } from '../lib/current-price-service';

async function main() {
  try {
    console.log('🔄 Starting current price update...');
    console.log('💰 Fetching latest prices for all active cryptocurrencies');
    console.log('📊 Using CoinGecko /simple/price endpoint for efficiency\n');
    
    await CurrentPriceService.updateCurrentPrices();
    
    console.log('\n✅ Current price update completed successfully!');
    console.log('\n🎯 What this accomplished:');
    console.log('   📈 Updated current prices for all cryptocurrencies');
    console.log('   💾 Stored prices in daily_prices table');
    console.log('   🔄 Ready for accurate dashboard display');
    
    console.log('\n💡 Next steps:');
    console.log('   1. Dashboard will show accurate current prices');
    console.log('   2. BMSB calculations use fresh price data');
    console.log('   3. Can be run daily for price updates');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error updating current prices:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}