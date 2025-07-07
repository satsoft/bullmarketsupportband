import { TwitterApi } from 'twitter-api-v2';
import { supabaseAdmin } from './supabase';
import { BMSBApiResponse, Ticker } from '../app/types';
import { TargetedScreenshotService } from './targeted-screenshot-service';
import { cache, CACHE_DURATION } from './cache';

export interface MarketSummary {
  totalTokens: number;
  healthyTokens: number;
  weakTokens: number;
  topPerformers: Ticker[];
  healthPercentage: number;
}

export interface TokenHealthChange {
  symbol: string;
  name: string;
  previousHealth: 'healthy' | 'weak';
  currentHealth: 'healthy' | 'weak';
  price: number;
  changePercent: number;
}

export class TwitterBotService {
  private twitterClient: TwitterApi;
  
  constructor() {
    this.twitterClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_SECRET!,
    });
  }

  /**
   * Fetch current market data from existing API
   */
  async fetchMarketData(): Promise<BMSBApiResponse> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/bmsb-data`);
    if (!response.ok) {
      throw new Error(`Failed to fetch market data: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Generate market summary for daily tweets
   */
  async generateMarketSummary(): Promise<MarketSummary> {
    const marketData = await this.fetchMarketData();
    const tokens = marketData.data.filter(token => token.band_health && !token.is_stablecoin);
    
    const healthyTokens = tokens.filter(token => token.band_health === 'healthy');
    const weakTokens = tokens.filter(token => token.band_health === 'weak');
    
    // Get top 5 performers by price change
    const topPerformers = tokens
      .filter(token => token.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5);

    return {
      totalTokens: tokens.length,
      healthyTokens: healthyTokens.length,
      weakTokens: weakTokens.length,
      topPerformers,
      healthPercentage: Math.round((healthyTokens.length / tokens.length) * 100)
    };
  }

  /**
   * Check for token health status changes
   */
  async detectHealthChanges(): Promise<TokenHealthChange[]> {
    // Check cache first to reduce database hits
    const cacheKey = 'health-changes';
    const cachedChanges = cache.get<TokenHealthChange[]>(cacheKey);
    if (cachedChanges) {
      console.log('Using cached health changes');
      return cachedChanges;
    }

    // Get all tokens with health data to check for changes (limit to top 200 for efficiency)
    const { data: allTokens } = await supabaseAdmin
      .from('bmsb_calculations')
      .select(`
        cryptocurrencies!inner (
          id, symbol, name, is_stablecoin, 
          price_change_percentage_24h, current_price, current_rank
        ),
        band_health, previous_health
      `)
      .eq('cryptocurrencies.is_stablecoin', false)
      .not('band_health', 'is', null)
      .lte('cryptocurrencies.current_rank', 200) // Only check top 200 tokens
      .limit(200);

    if (!allTokens || allTokens.length === 0) {
      return [];
    }

    // Filter for tokens where current health != previous health
    const changedTokens = allTokens.filter(token => 
      token.band_health !== token.previous_health && 
      token.previous_health !== null
    );

    if (!changedTokens || changedTokens.length === 0) {
      return [];
    }

    // Type the database response
    type DatabaseHealthChangeRow = {
      cryptocurrencies: {
        id: string;
        symbol: string;
        name: string;
        is_stablecoin: boolean;
        price_change_percentage_24h: number | null;
        current_price: number | null;
      };
      band_health: string;
      previous_health: string;
    };

    const typedChangedTokens = changedTokens as unknown as DatabaseHealthChangeRow[];

    const changes: TokenHealthChange[] = typedChangedTokens.map((row) => ({
      symbol: row.cryptocurrencies.symbol,
      name: row.cryptocurrencies.name,
      previousHealth: row.previous_health as 'healthy' | 'weak',
      currentHealth: row.band_health as 'healthy' | 'weak',
      price: row.cryptocurrencies.current_price || 0,
      changePercent: row.cryptocurrencies.price_change_percentage_24h || 0
    }));

    // Update previous_health to match current health for detected changes
    for (const change of changes) {
      const targetRow = typedChangedTokens.find((t) => 
        t.cryptocurrencies.symbol === change.symbol
      );
      if (targetRow) {
        await supabaseAdmin
          .from('bmsb_calculations')
          .update({ previous_health: change.currentHealth })
          .eq('cryptocurrency_id', targetRow.cryptocurrencies.id);
      }
    }
    
    // Cache the changes for 1 minute to reduce repeated queries
    cache.set(cacheKey, changes, CACHE_DURATION.HEALTH_CHANGES);
    
    return changes;
  }


  /**
   * Generate daily summary tweet
   */
  generateDailySummaryTweet(summary: MarketSummary): string {
    const { totalTokens, healthyTokens, weakTokens, healthPercentage, topPerformers } = summary;
    
    let tweet = `📊 Daily Market Health Update\n\n`;
    tweet += `🟢 Healthy: ${healthyTokens}/${totalTokens} tokens (${healthPercentage}%)\n`;
    tweet += `🔴 Weak: ${weakTokens}/${totalTokens} tokens\n\n`;
    
    if (topPerformers.length > 0) {
      tweet += `🚀 Top Performers:\n`;
      topPerformers.slice(0, 3).forEach(token => {
        tweet += `• ${token.symbol}: +${token.changePercent.toFixed(1)}%\n`;
      });
      tweet += `\n`;
    }
    
    tweet += `Bull Market Support Band analysis tracks ${totalTokens} tokens\n\n`;
    tweet += `#BMSB #CryptoAnalysis #BullMarket`;
    
    return tweet;
  }

  /**
   * Generate health change alert tweet
   */
  generateHealthChangeAlert(changes: TokenHealthChange[]): string[] {
    const tweets: string[] = [];
    
    // Group changes by type
    const toHealthy = changes.filter(c => c.currentHealth === 'healthy');
    const toWeak = changes.filter(c => c.currentHealth === 'weak');
    
    if (toHealthy.length > 0) {
      let tweet = `🟢 HEALTH IMPROVEMENT ALERT\n\n`;
      tweet += `${toHealthy.length} token${toHealthy.length > 1 ? 's' : ''} upgraded to HEALTHY:\n\n`;
      
      toHealthy.slice(0, 4).forEach(token => {
        tweet += `• $${token.symbol} (${token.name})\n`;
        tweet += `  💰 $${token.price.toFixed(4)}\n`;
        tweet += `  📈 ${token.changePercent > 0 ? '+' : ''}${token.changePercent.toFixed(1)}%\n\n`;
      });
      tweets.push(tweet);
    }
    
    if (toWeak.length > 0) {
      let tweet = `🔴 WEAKNESS ALERT\n\n`;
      tweet += `${toWeak.length} token${toWeak.length > 1 ? 's' : ''} downgraded to WEAK:\n\n`;
      
      toWeak.slice(0, 4).forEach(token => {
        tweet += `• $${token.symbol} (${token.name})\n`;
        tweet += `  💰 $${token.price.toFixed(4)}\n`;
        tweet += `  📉 ${token.changePercent > 0 ? '+' : ''}${token.changePercent.toFixed(1)}%\n\n`;
      });
      tweets.push(tweet);
    }
    
    return tweets;
  }

  /**
   * Post tweet to Twitter
   */
  async postTweet(text: string, mediaBuffer?: Buffer): Promise<void> {
    try {
      let mediaId: string | undefined;
      
      if (mediaBuffer) {
        const mediaUpload = await this.twitterClient.v1.uploadMedia(mediaBuffer, {
          mimeType: 'image/png'
        });
        mediaId = mediaUpload;
      }
      
      await this.twitterClient.v2.tweet({
        text,
        ...(mediaId && { media: { media_ids: [mediaId] } })
      });
      
      console.log('Tweet posted successfully');
    } catch (error) {
      console.error('Error posting tweet:', error);
      throw error;
    }
  }

  /**
   * Check if daily summary should be posted
   */
  async shouldPostDailySummary(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: lastPost } = await supabaseAdmin
      .from('twitter_bot_posts')
      .select('*')
      .eq('post_type', 'daily_summary')
      .gte('created_at', `${today}T00:00:00`)
      .limit(1);
    
    return !lastPost || lastPost.length === 0;
  }

  /**
   * Record posted tweet
   */
  async recordPost(postType: 'daily_summary' | 'health_change', content: string): Promise<void> {
    await supabaseAdmin
      .from('twitter_bot_posts')
      .insert({
        post_type: postType,
        content,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Main execution function for daily summary
   */
  async executeDailySummary(): Promise<void> {
    try {
      const shouldPost = await this.shouldPostDailySummary();
      if (!shouldPost) {
        console.log('Daily summary already posted today');
        return;
      }

      const summary = await this.generateMarketSummary();
      const tweetText = this.generateDailySummaryTweet(summary);
      
      await this.postTweet(tweetText);
      await this.recordPost('daily_summary', tweetText);
      
      console.log('Daily summary posted successfully');
    } catch (error) {
      console.error('Error executing daily summary:', error);
      throw error;
    }
  }

  /**
   * Capture screenshot of a standalone ticker chart page
   */
  async captureTickerChart(ticker: string): Promise<Buffer> {
    const puppeteer = await import('puppeteer');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    try {
      const page = await browser.newPage();
      
      // Set viewport size for 1:1 ratio optimized for Twitter
      await page.setViewport({ 
        width: 600, 
        height: 600,
        deviceScaleFactor: 2
      });

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bullmarketsupportband.com';
      const url = `${baseUrl}/${ticker.toLowerCase()}`;
      
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      // Wait for chart to load
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Take screenshot with custom crop including header + chart but excluding footer
      const contentBounds = await page.evaluate(() => {
        const header = document.querySelector('div.text-center.mb-4');
        const chart = document.querySelector('div.max-w-sm');
        
        if (header && chart) {
          const headerRect = header.getBoundingClientRect();
          const chartRect = chart.getBoundingClientRect();
          
          // Add padding around the content
          const padding = 20;
          
          return {
            x: Math.min(headerRect.x, chartRect.x) - padding,
            y: headerRect.y - padding,
            width: Math.max(headerRect.width, chartRect.width) + (padding * 2),
            height: (chartRect.y + chartRect.height) - headerRect.y + (padding * 2)
          };
        }
        return null;
      });
      
      let screenshot: Buffer;
      
      if (contentBounds) {
        // Screenshot the calculated content area
        const contentScreenshot = await page.screenshot({ 
          type: 'png',
          clip: contentBounds
        });
        screenshot = Buffer.from(contentScreenshot);
      } else {
        // Fallback to viewport screenshot
        const fallbackScreenshot = await page.screenshot({ 
          type: 'png',
          fullPage: false
        });
        screenshot = Buffer.from(fallbackScreenshot);
      }
      
      return screenshot;
    } finally {
      await browser.close();
    }
  }

  /**
   * Main execution function for health change alerts with chart screenshots
   */
  async executeHealthChangeAlerts(): Promise<void> {
    try {
      const changes = await this.detectHealthChanges();
      
      if (changes.length === 0) {
        console.log('No health changes detected');
        return;
      }

      // Focus on tokens that improved to healthy (most positive news)
      const toHealthy = changes.filter(c => c.currentHealth === 'healthy');
      const toWeak = changes.filter(c => c.currentHealth === 'weak');

      // Post health improvements with individual chart screenshots
      for (const token of toHealthy.slice(0, 3)) { // Limit to top 3 to avoid spam
        try {
          const screenshot = await this.captureTickerChart(token.symbol);
          
          const tweetText = `🟢 HEALTH IMPROVEMENT ALERT

$${token.symbol} (${token.name}) upgraded to HEALTHY!

💰 Current Price: $${token.price < 1 ? token.price.toFixed(6) : token.price.toFixed(2)}
📈 24h Change: ${token.changePercent > 0 ? '+' : ''}${token.changePercent.toFixed(1)}%

The Bull Market Support Band analysis shows that this token's moving averages are now trending up.`;

          await this.postTweet(tweetText, screenshot);
          await this.recordPost('health_change', tweetText);
          
          // Wait between tweets to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 10000));
        } catch (error) {
          console.error(`Failed to post health improvement alert for ${token.symbol}:`, error);
          // Fallback to text-only tweet
          const fallbackText = `🟢 $${token.symbol} upgraded to HEALTHY! Price: $${token.price.toFixed(4)} | 24h: ${token.changePercent > 0 ? '+' : ''}${token.changePercent.toFixed(1)}%`;
          await this.postTweet(fallbackText);
          await this.recordPost('health_change', fallbackText);
        }
      }

      // Post summary for weakness alerts (text only to avoid too many images)
      if (toWeak.length > 0) {
        const weaknessTweets = this.generateHealthChangeAlert(toWeak);
        for (const tweet of weaknessTweets) {
          await this.postTweet(tweet);
          await this.recordPost('health_change', tweet);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
      
      console.log(`Posted health change alerts: ${toHealthy.length} improvements, ${toWeak.length} weakness alerts`);
    } catch (error) {
      console.error('Error executing health change alerts:', error);
      throw error;
    }
  }

  /**
   * Generate Top 10 market cap tweet with screenshot
   */
  async executeTop10MarketCap(): Promise<void> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bullmarketsupportband.com';
      
      // Get screenshot and tweet data
      const result = await TargetedScreenshotService.captureTop10WithData(baseUrl);
      
      // Generate tweet text based on actual market data
      const tweetText = `Here is your daily market update 👇
${result.tweetData.marketStatusEmoji} Market Status: ${result.tweetData.marketStatus}
Top 100:
🟢 ${result.tweetData.healthyCount} Healthy
🔴 ${result.tweetData.weakCount} Weak

Healthy Tokens in the Top 10:
${result.tweetData.healthyTokensTop10.join(' ')}`;

      // Post tweet with screenshot
      await this.postTweet(tweetText, result.screenshot);
      await this.recordPost('daily_summary', tweetText);
      
      console.log('Top 10 market cap tweet posted successfully');
    } catch (error) {
      console.error('Error executing Top 10 market cap tweet:', error);
      throw error;
    }
  }

  /**
   * Check if Top 10 summary should be posted
   */
  async shouldPostTop10Summary(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: lastPost } = await supabaseAdmin
      .from('twitter_bot_posts')
      .select('*')
      .eq('post_type', 'daily_summary')
      .gte('created_at', `${today}T00:00:00`)
      .limit(1);
    
    return !lastPost || lastPost.length === 0;
  }
}