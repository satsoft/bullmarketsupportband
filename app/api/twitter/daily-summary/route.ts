import { NextRequest, NextResponse } from 'next/server';
import { TwitterBotService } from '../../../../lib/twitter-bot-service';
import { ScreenshotService } from '../../../../lib/screenshot-service';

export const maxDuration = 300; // 5 minutes for Vercel

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const botService = new TwitterBotService();
    
    // Check if daily summary should be posted
    const shouldPost = await botService.shouldPostDailySummary();
    if (!shouldPost) {
      return NextResponse.json({ 
        success: true, 
        message: 'Daily summary already posted today' 
      });
    }

    // Generate market summary
    const summary = await botService.generateMarketSummary();
    const tweetText = botService.generateDailySummaryTweet(summary);
    
    // Optionally capture screenshot
    let screenshot: Buffer | undefined;
    if (process.env.INCLUDE_SCREENSHOTS === 'true') {
      try {
        screenshot = await ScreenshotService.captureTwitterOptimized(
          process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        );
      } catch (error) {
        console.warn('Screenshot capture failed:', error);
      }
    }
    
    // Post tweet
    await botService.postTweet(tweetText, screenshot);
    await botService.recordPost('daily_summary', tweetText);
    
    return NextResponse.json({
      success: true,
      message: 'Daily summary posted successfully',
      data: {
        totalTokens: summary.totalTokens,
        healthyTokens: summary.healthyTokens,
        healthPercentage: summary.healthPercentage
      }
    });

  } catch (error) {
    console.error('Daily summary API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}