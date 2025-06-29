#!/usr/bin/env tsx

/**
 * Twitter Health Alerts Script
 * Detects health changes and posts Twitter alerts with chart screenshots
 */

import { TwitterBotService } from '../lib/twitter-bot-service';

async function main() {
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