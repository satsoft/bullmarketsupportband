#!/usr/bin/env tsx

import { CryptocurrencyService } from '../lib/crypto-service';

async function main() {
  try {
    console.log('🚀 Starting cryptocurrency discovery...');
    console.log('This will fetch the top 200 cryptocurrencies from CoinGecko and store them in the database.');
    
    const limit = process.argv[2] ? parseInt(process.argv[2]) : 200;
    console.log(`📊 Discovering top ${limit} cryptocurrencies...`);
    
    await CryptocurrencyService.discoverAndStoreCryptocurrencies(limit);
    
    console.log('✅ Cryptocurrency discovery completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during cryptocurrency discovery:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}