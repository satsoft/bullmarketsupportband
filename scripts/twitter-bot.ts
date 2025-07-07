#!/usr/bin/env tsx

/**
 * Twitter Bot Script
 * Handles both daily summaries and real-time health change alerts
 * 
 * Usage:
 * npm run twitter-bot:daily      # Post daily summary
 * npm run twitter-bot:alerts     # Check for health changes and post alerts
 * npm run twitter-bot:all        # Run both daily and alerts
 */

import dotenv from 'dotenv';
import { TwitterBotService } from '../lib/twitter-bot-service';
import { ScreenshotService } from '../lib/screenshot-service';

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

async function postDailySummary(): Promise<void> {
  console.log('🤖 Starting daily summary posting...');
  
  const botService = new TwitterBotService();
  
  try {
    // Check if we should post today
    const shouldPost = await botService.shouldPostTop10Summary();
    if (!shouldPost) {
      console.log('ℹ️  Daily summary already posted today');
      return;
    }

    // Execute Top 10 market cap summary (new default daily format)
    await botService.executeTop10MarketCap();
    
    console.log('✅ Daily summary posted successfully');
    
  } catch (error) {
    console.error('❌ Error posting daily summary:', error);
    process.exit(1);
  }
}

async function checkHealthChanges(): Promise<void> {
  console.log('🔍 Checking for health changes...');
  
  const botService = new TwitterBotService();
  
  try {
    // Detect health changes
    const changes = await botService.detectHealthChanges();
    
    if (changes.length === 0) {
      console.log('ℹ️  No health changes detected');
      return;
    }
    
    console.log(`📢 Found ${changes.length} health change(s)`);
    changes.forEach(change => {
      console.log(`  • ${change.symbol}: ${change.previousHealth} → ${change.currentHealth}`);
    });
    
    // Generate alert tweets
    const tweets = botService.generateHealthChangeAlert(changes);
    
    // Post each tweet
    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];
      console.log(`📝 Posting alert ${i + 1}/${tweets.length}:`, tweet.substring(0, 100) + '...');
      
      await botService.postTweet(tweet);
      await botService.recordPost('health_change', tweet);
      
      // Rate limiting between tweets
      if (i < tweets.length - 1) {
        console.log('⏳ Waiting 5 seconds before next tweet...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`✅ Posted ${tweets.length} health change alert(s)`);
    
  } catch (error) {
    console.error('❌ Error checking health changes:', error);
    process.exit(1);
  }
}


async function runAll(): Promise<void> {
  console.log('🚀 Running complete Twitter bot cycle...');
  
  try {
    await postDailySummary();
    console.log('⏳ Waiting 10 seconds between operations...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    await checkHealthChanges();
    
    console.log('✅ Twitter bot cycle completed successfully');
  } catch (error) {
    console.error('❌ Error in Twitter bot cycle:', error);
    process.exit(1);
  }
}

// CLI handling
async function main(): Promise<void> {
  validateEnvironment();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'daily':
      await postDailySummary();
      break;
      
    case 'alerts':
      await checkHealthChanges();
      break;
      
    case 'all':
    case undefined:
      await runAll();
      break;
      
    default:
      console.error('❌ Unknown command:', command);
      console.error('Usage: tsx scripts/twitter-bot.ts [daily|alerts|all]');
      process.exit(1);
  }
  
  // Force exit after successful completion
  process.exit(0);
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}