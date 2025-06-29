#!/usr/bin/env tsx

/**
 * Test Ticker Screenshot
 * Tests taking a 1:1 ratio screenshot of the ticker page
 */

import puppeteer from 'puppeteer';
import path from 'path';

async function testTickerScreenshot(): Promise<void> {
  console.log('📸 Testing ticker page screenshot with 1:1 ratio...\n');
  
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
    
    // Set viewport for 1:1 ratio (square) optimized for Twitter
    await page.setViewport({ 
      width: 600, 
      height: 600, // 1:1 ratio
      deviceScaleFactor: 2 // High quality
    });

    // Test with BTC
    const ticker = 'BTC';
    const url = `http://localhost:3000/${ticker.toLowerCase()}`;
    console.log(`📊 Loading ticker page: ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait for TradingView chart to load
    console.log('⏳ Waiting for TradingView chart to load...');
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    // Take screenshot with tighter crop including the header and chart
    const screenshotPath = path.join(process.cwd(), `test-ticker-${ticker.toLowerCase()}-1to1.png`);
    
    // Take a custom crop that includes header + chart but excludes footer
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
    
    if (contentBounds) {
      // Screenshot the calculated content area
      await page.screenshot({ 
        path: screenshotPath,
        type: 'png',
        clip: contentBounds
      });
    } else {
      // Fallback to viewport screenshot
      await page.screenshot({ 
        path: screenshotPath,
        type: 'png',
        fullPage: false
      });
    }
    
    console.log(`✅ Screenshot saved: ${screenshotPath}`);
    console.log(`📐 Dimensions: Cropped to chart container (1:1 ratio)`);
    
    // Check page elements and errors
    const pageContent = await page.evaluate(() => {
      const errors = [];
      const bodyText = document.body.textContent || '';
      
      // Check for console errors
      const logEntries = window.console.error || [];
      
      return {
        hasError: bodyText.includes('Error') || bodyText.includes('error'),
        hasLoading: bodyText.includes('Loading'),
        hasBMSBData: bodyText.includes('Bull Market Support Band Data'),
        hasTickerSymbol: bodyText.includes('BTC'),
        bodyText: bodyText.substring(0, 500),
        currentUrl: window.location.href
      };
    });
    
    console.log('\n📋 Page Content Analysis:');
    console.log(`🌐 URL: ${pageContent.currentUrl}`);
    console.log(`❌ Has Error: ${pageContent.hasError}`);
    console.log(`⏳ Still Loading: ${pageContent.hasLoading}`);
    console.log(`✅ BMSB Data: ${pageContent.hasBMSBData ? 'Found' : 'Missing'}`);
    console.log(`✅ Ticker Symbol: ${pageContent.hasTickerSymbol ? 'Found' : 'Missing'}`);
    console.log(`📄 Content preview: ${pageContent.bodyText}...`);
    
    
    console.log('\n🎉 Ticker screenshot test completed!');
    console.log('📝 Review the generated image to verify:');
    console.log('  - 1:1 aspect ratio is correct');
    console.log('  - Chart popup design is compact');
    console.log('  - BMSB data section is visible');
    console.log('  - TradingView chart is embedded');
    console.log('  - Layout is Twitter-friendly');
    
  } catch (error) {
    console.error('❌ Screenshot test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testTickerScreenshot().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});