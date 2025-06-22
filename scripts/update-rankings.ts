#!/usr/bin/env tsx

import { CryptocurrencyService } from '../lib/crypto-service';

async function main() {
  try {
    console.log('🚀 Starting ranking updates...');
    console.log('This will update cryptocurrency market cap rankings from CoinGecko.');
    
    await CryptocurrencyService.updateCryptocurrencyRankings();
    
    console.log('✅ Ranking updates completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during ranking updates:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}