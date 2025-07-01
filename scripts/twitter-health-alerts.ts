#!/usr/bin/env tsx

/**
 * Twitter Health Alerts Script
 * Detects health changes and posts Twitter alerts with chart screenshots
 */

import dotenv from 'dotenv';
import { TwitterBotService } from '../lib/twitter-bot-service';

// Load environment variables
dotenv.config();

const REQUIRED_ENV_VARS = [
  'TWITTER_API_KEY',
  'TWITTER_API_SECRET', 
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_SECRET',
  'NEXT_PUBLIC_BASE_URL'
];

function validateEnvironment(): void {
  const missing = REQUIRED_ENV_VARS.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(envVar => console.error(`  - ${envVar}`));
    console.error('\nPlease set these in your .env file or environment.');
    process.exit(1);
  }
}

async function main() {
  validateEnvironment();
  
  try {
    console.log('🤖 Starting Twitter health alerts check...\n');
    
    const botService = new TwitterBotService();
    
    // Execute health change alerts (includes screenshots)
    await botService.executeHealthChangeAlerts();
    
    console.log('\n✅ Twitter health alerts completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during health alerts:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}