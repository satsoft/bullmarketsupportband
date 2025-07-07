import cron from 'node-cron';
import { TwitterBotService } from './twitter-bot-service';
import { ScreenshotService } from './screenshot-service';

export class TwitterBotScheduler {
  private botService: TwitterBotService;
  private isRunning: boolean = false;
  private jobs: cron.ScheduledTask[] = [];
  
  constructor() {
    this.botService = new TwitterBotService();
  }

  /**
   * Start the scheduler with predefined cron jobs
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️  Scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting Twitter Bot Scheduler...');

    // Daily summary at 9 AM UTC (4 AM EST, 1 AM PST)
    const dailyJob = cron.schedule('0 9 * * *', async () => {
      console.log('⏰ Triggered daily summary job');
      await this.executeDailySummaryJob();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });
    this.jobs.push(dailyJob);

    // Health change checks every 30 minutes
    const healthJob = cron.schedule('*/30 * * * *', async () => {
      console.log('⏰ Triggered health change check');
      await this.executeHealthChangeJob();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });
    this.jobs.push(healthJob);

    console.log('✅ Scheduler started successfully');
    console.log('   📅 Daily summaries: 9:00 AM UTC');
    console.log('   🔍 Health checks: Every 30 minutes');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️  Scheduler is not running');
      return;
    }

    // Stop all scheduled jobs
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.isRunning = false;
    console.log('🛑 Scheduler stopped');
  }

  /**
   * Execute daily summary job with error handling
   */
  private async executeDailySummaryJob(): Promise<void> {
    try {
      console.log('📊 Executing daily summary job...');
      
      const shouldPost = await this.botService.shouldPostDailySummary();
      if (!shouldPost) {
        console.log('ℹ️  Daily summary already posted today');
        return;
      }

      const summary = await this.botService.generateMarketSummary();
      const tweetText = this.botService.generateDailySummaryTweet(summary);
      
      // Capture screenshot if enabled
      let screenshot: Buffer | undefined;
      if (process.env.INCLUDE_SCREENSHOTS === 'true') {
        try {
          screenshot = await ScreenshotService.captureTwitterOptimized(
            process.env.NEXT_PUBLIC_BASE_URL!
          );
        } catch (error) {
          console.warn('⚠️  Screenshot failed, posting without image:', error);
        }
      }
      
      await this.botService.postTweet(tweetText, screenshot);
      await this.botService.recordPost('daily_summary', tweetText);
      
      console.log(`✅ Daily summary posted: ${summary.healthyTokens}/${summary.totalTokens} healthy`);
      
    } catch (error) {
      console.error('❌ Daily summary job failed:', error);
      
      // Optional: Send error notification
      await this.handleJobError('daily_summary', error);
    }
  }

  /**
   * Execute health change check job with error handling
   */
  private async executeHealthChangeJob(): Promise<void> {
    try {
      console.log('🔍 Executing health change check...');
      
      const changes = await this.botService.detectHealthChanges();
      
      if (changes.length === 0) {
        console.log('ℹ️  No health changes detected');
        return;
      }

      const tweets = this.botService.generateHealthChangeAlert(changes);
      
      for (let i = 0; i < tweets.length; i++) {
        await this.botService.postTweet(tweets[i]);
        await this.botService.recordPost('health_change', tweets[i]);
        
        // Rate limiting between tweets
        if (i < tweets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      console.log(`✅ Posted ${tweets.length} health change alert(s) for ${changes.length} token(s)`);
      
    } catch (error) {
      console.error('❌ Health change job failed:', error);
      
      // Optional: Send error notification
      await this.handleJobError('health_change', error);
    }
  }

  /**
   * Handle job errors (could send notifications, log to database, etc.)
   */
  private async handleJobError(jobType: string, error: Error): Promise<void> {
    const errorMessage = `Twitter bot job failed: ${jobType}\nError: ${error.message || error}`;
    console.error(errorMessage);
    
    // TODO: Implement error notification system
    // - Send email alert
    // - Log to monitoring service
    // - Store in database for debugging
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; jobs: string[] } {
    return {
      isRunning: this.isRunning,
      jobs: [
        'Daily Summary: 9:00 AM UTC',
        'Health Checks: Every 30 minutes'
      ]
    };
  }

  /**
   * Manual trigger for testing
   */
  async triggerDailySummary(): Promise<void> {
    console.log('🧪 Manual trigger: Daily summary');
    await this.executeDailySummaryJob();
  }

  /**
   * Manual trigger for testing
   */
  async triggerHealthCheck(): Promise<void> {
    console.log('🧪 Manual trigger: Health check');
    await this.executeHealthChangeJob();
  }
}