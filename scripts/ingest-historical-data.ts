#!/usr/bin/env tsx

import { DataIngestionService } from '../lib/data-ingestion-service';

async function main() {
  try {
    console.log('🚀 Starting comprehensive historical data ingestion...');
    console.log('📊 This will store weekly and daily price data in the database');
    console.log('💾 Data will be used for future BMSB calculations and analysis\n');
    
    // Ingest data for ALL active cryptocurrencies
    console.log('🎯 Target: ALL active cryptocurrencies in database');
    console.log('📈 This will fetch 365 days of historical data for each');
    console.log('⏱️  Estimated time: ~10-15 minutes for all cryptos\n');
    
    await DataIngestionService.ingestHistoricalDataForAllCryptos();
    
    console.log('\n✅ Historical data ingestion completed successfully!');
    console.log('\n🎯 Benefits:');
    console.log('   ✅ Weekly price data stored for BMSB calculations');
    console.log('   ✅ Daily price data for trend analysis');
    console.log('   ✅ Historical data for backtesting');
    console.log('   ✅ Foundation for real-time updates');
    
    console.log('\n🚀 Next steps:');
    console.log('   1. Use stored data for faster BMSB calculations');
    console.log('   2. Set up daily price updates with: npm run update-daily-prices');
    console.log('   3. Dashboard now has comprehensive historical foundation');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during historical data ingestion:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}