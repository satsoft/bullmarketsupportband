import puppeteer from 'puppeteer';

export class ScreenshotService {
  /**
   * Generate screenshot of the market dashboard
   */
  static async captureMarketView(baseUrl: string): Promise<Buffer> {
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--window-size=1200,800'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set viewport for consistent screenshots
      await page.setViewport({
        width: 900,
        height: 600,
        deviceScaleFactor: 2 // For higher quality
      });
      
      // Navigate to dashboard
      await page.goto(`${baseUrl}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for data to load
      await page.waitForSelector('[data-testid="ticker-item"]', { timeout: 15000 });
      
      // Optional: Hide elements that shouldn't be in screenshot
      await page.addStyleTag({
        content: `
          .consent-popup,
          .cookie-banner,
          [data-testid="consent-popup"] {
            display: none !important;
          }
        `
      });
      
      // Take screenshot of the main content area
      const screenshot = await page.screenshot({
        type: 'png',
        quality: 90,
        fullPage: false // Just the viewport
      });
      
      return screenshot as Buffer;
      
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generate screenshot with custom styling for Twitter
   */
  static async captureTwitterOptimized(baseUrl: string): Promise<Buffer> {
    let browser;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      // Twitter image dimensions work well at 16:9 or 2:1 ratio
      await page.setViewport({
        width: 900,
        height: 506, // 16:9 ratio
        deviceScaleFactor: 2
      });
      
      await page.goto(`${baseUrl}`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await page.waitForSelector('[data-testid="ticker-item"]', { timeout: 15000 });
      
      // Add Twitter-specific styling
      await page.addStyleTag({
        content: `
          body {
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          }
          
          .consent-popup,
          .cookie-banner,
          [data-testid="consent-popup"] {
            display: none !important;
          }
          
          /* Add Twitter branding watermark */
          body::after {
            content: "@YourBotHandle • Bull Market Support Band";
            position: fixed;
            bottom: 20px;
            right: 20px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
            font-family: system-ui, -apple-system, sans-serif;
            z-index: 1000;
          }
        `
      });
      
      const screenshot = await page.screenshot({
        type: 'png',
        quality: 95
      });
      
      return screenshot as Buffer;
      
    } catch (error) {
      console.error('Error capturing Twitter-optimized screenshot:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}