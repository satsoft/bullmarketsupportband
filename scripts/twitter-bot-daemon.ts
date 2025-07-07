#!/usr/bin/env tsx

/**
 * Twitter Bot Daemon
 * Long-running process that handles automated Twitter posting
 * 
 * This daemon runs continuously and executes:
 * - Daily market summaries at 9 AM UTC
 * - Health change alerts every 30 minutes
 * 
 * Usage:
 * npm run twitter-bot:daemon
 */

import dotenv from 'dotenv';
import { TwitterBotScheduler } from '../lib/twitter-bot-scheduler';

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

function setupGracefulShutdown(scheduler: TwitterBotScheduler): void {
  const shutdown = (signal: string) => {
    console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
    scheduler.stop();
    console.log('👋 Twitter bot daemon stopped');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // For nodemon
}

async function startDaemon(): Promise<void> {
  validateEnvironment();
  
  console.log('🤖 Starting Twitter Bot Daemon...');
  console.log(`🌐 Base URL: ${process.env.NEXT_PUBLIC_BASE_URL}`);
  console.log(`📸 Screenshots: ${process.env.INCLUDE_SCREENSHOTS === 'true' ? 'Enabled' : 'Disabled'}`);
  
  const scheduler = new TwitterBotScheduler();
  
  // Setup graceful shutdown
  setupGracefulShutdown(scheduler);
  
  try {
    // Start the scheduler
    scheduler.start();
    
    const status = scheduler.getStatus();
    console.log('✅ Daemon started successfully');
    console.log('📋 Scheduled jobs:');
    status.jobs.forEach(job => console.log(`   • ${job}`));
    
    // Keep the process alive
    console.log('🔄 Daemon is running... Press Ctrl+C to stop');
    
    // Health check interval - log status every hour
    setInterval(() => {
      const now = new Date().toISOString();
      console.log(`💓 Health check: ${now} - Daemon is running`);
    }, 3600000); // 1 hour
    
    // Prevent the process from exiting
    process.stdin.resume();
    
  } catch (error) {
    console.error('❌ Failed to start daemon:', error);
    process.exit(1);
  }
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

// Start the daemon
if (require.main === module) {
  startDaemon().catch(error => {
    console.error('❌ Daemon startup failed:', error);
    process.exit(1);
  });
}