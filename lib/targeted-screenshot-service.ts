import puppeteer from 'puppeteer';

export class TargetedScreenshotService {
  
  /**
   * Capture just the market status section
   */
  static async captureMarketStatusSection(baseUrl: string): Promise<Buffer> {
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
      
      await page.setViewport({
        width: 1000,
        height: 500, // 2:1 ratio for Twitter
        deviceScaleFactor: 1
      });
      
      await page.goto(baseUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await page.waitForSelector('[id^="ticker-"]', { timeout: 15000 });
      
      // Wait for the market status to load
      await page.waitForSelector('[data-testid="market-status"], .flex.items-center.space-x-2, .flex.flex-wrap.items-center', { timeout: 15000 });
      
      // Extract the actual market data
      const marketData = await page.evaluate(() => {
        // Look for the market status elements
        const statusElements = document.querySelectorAll('.bg-red-500, .bg-green-500, .bg-yellow-500, .bg-orange-500');
        let mainStatus = 'BEARISH';
        let mainColor = '#ef4444';
        let mainEmoji = '🔴';
        
        // Find the main status by looking at the largest status element
        let maxElement = null;
        let maxFontSize = 0;
        
        statusElements.forEach(el => {
          const computedStyle = window.getComputedStyle(el);
          const fontSize = parseFloat(computedStyle.fontSize);
          if (fontSize > maxFontSize) {
            maxFontSize = fontSize;
            maxElement = el;
          }
        });
        
        if (maxElement) {
          const text = maxElement.textContent?.trim().toUpperCase();
          if (text === 'BEARISH') {
            mainStatus = 'BEARISH';
            mainColor = '#ef4444';
            mainEmoji = '🔴';
          } else if (text === 'BULLISH') {
            mainStatus = 'BULLISH';
            mainColor = '#10b981';
            mainEmoji = '🟢';
          } else if (text === 'NEUTRAL') {
            mainStatus = 'NEUTRAL';
            mainColor = '#f59e0b';
            mainEmoji = '🟡';
          }
        }
        
        // Count healthy and weak by looking for the pattern "number HEALTHY" or "number WEAK"
        let healthyCount = 0;
        let weakCount = 0;
        
        // Look for all text content in the page
        const allText = document.body.textContent || '';
        
        // Look for patterns like "20HEALTHY" or "80WEAK" (no space)
        const healthyMatch = allText.match(/(\d+)\s*HEALTHY/i);
        const weakMatch = allText.match(/(\d+)\s*WEAK/i);
        
        if (healthyMatch) {
          healthyCount = parseInt(healthyMatch[1]);
        }
        
        if (weakMatch) {
          weakCount = parseInt(weakMatch[1]);
        }
        
        // Debug: log what we found
        console.log('Market data extracted:', { mainStatus, healthyCount, weakCount, allText: allText.substring(0, 200) });
        
        return { mainStatus, mainColor, mainEmoji, healthyCount, weakCount };
      });
      
      // Create the perfect 2:1 layout with real data
      await page.evaluate((data) => {
        // Clear the body and create a custom layout
        document.body.innerHTML = '';
        
        // Create the main container
        const container = document.createElement('div');
        container.style.cssText = `
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100vh;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          margin: 0;
          padding: 0;
          font-family: system-ui, -apple-system, sans-serif;
        `;
        
        // Create the market status card
        const card = document.createElement('div');
        card.style.cssText = `
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 60px 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 40px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
          max-width: 90%;
        `;
        
        // Add "MARKET STATUS" title
        const title = document.createElement('div');
        title.textContent = 'MARKET STATUS';
        title.style.cssText = `
          font-size: 2.5rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: 0.1em;
          text-align: center;
        `;
        
        // Add main status with real data
        const mainStatus = document.createElement('div');
        mainStatus.innerHTML = `${data.mainEmoji} <span style="color: ${data.mainColor}; font-size: 4rem; font-weight: 800; letter-spacing: 0.05em;">${data.mainStatus}</span>`;
        mainStatus.style.cssText = `
          display: flex;
          align-items: center;
          gap: 20px;
          font-size: 4rem;
        `;
        
        // Add healthy/weak counts with real data
        const counts = document.createElement('div');
        counts.innerHTML = `
          <div style="display: flex; align-items: center; gap: 15px; color: #10b981; font-size: 2.5rem; font-weight: 600;">
            🟢 <span style="font-size: 3rem; font-weight: 700;">${data.healthyCount}</span> <span style="color: #ffffff;">HEALTHY</span>
          </div>
          <div style="display: flex; align-items: center; gap: 15px; color: #ef4444; font-size: 2.5rem; font-weight: 600; margin-left: 60px;">
            🔴 <span style="font-size: 3rem; font-weight: 700;">${data.weakCount}</span> <span style="color: #ffffff;">WEAK</span>
          </div>
        `;
        counts.style.cssText = `
          display: flex;
          align-items: center;
          gap: 40px;
          flex-wrap: wrap;
          justify-content: center;
        `;
        
        // Assemble everything
        card.appendChild(title);
        card.appendChild(mainStatus);
        card.appendChild(counts);
        container.appendChild(card);
        document.body.appendChild(container);
      }, marketData);
        
      // Take a full page screenshot since we've styled the entire page
      const screenshot = await page.screenshot({ 
        type: 'png',
        fullPage: false // Just the viewport (2:1 ratio)
      });
      return screenshot as Buffer;
      
    } catch (error) {
      console.error('Error capturing market status section:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  
  /**
   * Capture just the top 10 ticker rows in mobile single-column layout
   */
  static async captureTop10Section(baseUrl: string): Promise<Buffer> {
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
      
      // Use Twitter portrait viewport (1080x1350 max)
      await page.setViewport({
        width: 540,
        height: 675, // Half of 1080x1350 for deviceScaleFactor: 2
        deviceScaleFactor: 2
      });
      
      await page.goto(baseUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await page.waitForSelector('[id^="ticker-"]', { timeout: 15000 });
      
      // Get the top 10 tickers and create a clean layout
      const top10Data = await page.evaluate(() => {
        const tickers = document.querySelectorAll('[id^="ticker-"]');
        const top10 = Array.from(tickers).slice(0, 10);
        
        // Map of common crypto symbols to full names
        const cryptoNames = {
          'BTC': 'Bitcoin',
          'ETH': 'Ethereum', 
          'XRP': 'XRP',
          'BNB': 'BNB',
          'SOL': 'Solana',
          'TRX': 'TRON',
          'DOGE': 'Dogecoin',
          'ADA': 'Cardano',
          'HYPE': 'Hyperliquid',
          'BCH': 'Bitcoin Cash',
          'AVAX': 'Avalanche',
          'DOT': 'Polkadot',
          'LINK': 'Chainlink',
          'UNI': 'Uniswap',
          'LTC': 'Litecoin',
          'NEAR': 'NEAR Protocol',
          'APT': 'Aptos',
          'POL': 'Polygon',
          'PEPE': 'Pepe',
          'SUI': 'Sui'
        };
        
        return top10.map((ticker, index) => {
          // Extract symbol from the ticker ID (e.g., "ticker-BTC" -> "BTC")
          const tickerId = ticker.id;
          const symbol = tickerId.replace('ticker-', '');
          const fullName = cryptoNames[symbol] || symbol;
          
          // Find price element - look for price patterns
          const priceEl = ticker.querySelector('.text-right') || ticker.querySelector('[class*="price"]');
          let price = priceEl?.textContent?.trim() || '';
          
          // Clean up price to just show the dollar amount
          if (price.includes('$')) {
            price = price.split('$')[1]?.split(' ')[0] || price;
            price = '$' + price;
          }
          
          // Find BMSB status element
          const bmsbEl = ticker.querySelector('.bg-green-500, .bg-red-500, .bg-yellow-500, .bg-orange-500');
          const bmsbText = bmsbEl?.textContent?.trim() || '';
          
          return {
            rank: index + 1,
            symbol: symbol,
            fullName: fullName,
            price: price,
            bmsb: bmsbText,
            bmsbColor: bmsbEl?.classList.contains('bg-green-500') ? '#10b981' :
                      bmsbEl?.classList.contains('bg-red-500') ? '#ef4444' :
                      bmsbEl?.classList.contains('bg-yellow-500') ? '#f59e0b' : '#f97316'
          };
        });
      });
      
      // Get overall market status data
      const marketStatusData = await page.evaluate(() => {
        // Look for all text content in the page
        const allText = document.body.textContent || '';
        
        // Look for patterns like "20HEALTHY" or "80WEAK" (no space)
        const healthyMatch = allText.match(/(\d+)\s*HEALTHY/i);
        const weakMatch = allText.match(/(\d+)\s*WEAK/i);
        
        let healthyCount = 0;
        let weakCount = 0;
        
        if (healthyMatch) {
          healthyCount = parseInt(healthyMatch[1]);
        }
        
        if (weakMatch) {
          weakCount = parseInt(weakMatch[1]);
        }
        
        // Determine overall market status
        let marketStatus = 'BEARISH';
        let marketColor = '#ef4444';
        
        if (healthyCount > weakCount) {
          marketStatus = 'BULLISH';
          marketColor = '#10b981';
        } else if (healthyCount === weakCount) {
          marketStatus = 'NEUTRAL';
          marketColor = '#f59e0b';
        }
        
        return { marketStatus, marketColor, healthyCount, weakCount };
      });
      
      // Create an enhanced top 10 layout with market status
      await page.evaluate((data, marketData) => {
        // Clear the body and create layout
        document.body.innerHTML = '';
        
        const container = document.createElement('div');
        container.style.cssText = `
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          width: 100vw;
          height: 100vh;
          padding: 30px 20px 20px;
          font-family: system-ui, -apple-system, sans-serif;
          overflow: hidden;
          box-sizing: border-box;
        `;
        
        // Add title with chart emoji (external images don't load reliably in screenshots)
        const title = document.createElement('div');
        title.textContent = '📊 TOP 10 MARKET CAP';
        title.style.cssText = `
          font-size: 1.9rem;
          font-weight: 700;
          color: #ffffff;
          text-align: center;
          margin-bottom: 20px;
          letter-spacing: 0.05em;
        `;
        
        // Add column headers
        const headers = document.createElement('div');
        headers.style.cssText = `
          display: grid;
          grid-template-columns: 50px 60px 120px 90px 120px;
          gap: 8px;
          padding: 0 15px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 12px;
          align-items: center;
        `;
        
        const headers_list = ['RANK', 'TICKER', 'NAME', 'PRICE', 'BMSB STATUS'];
        const aligns = ['center', 'left', 'left', 'left', 'center'];
        
        headers_list.forEach((headerText, index) => {
          const header = document.createElement('div');
          header.textContent = headerText;
          header.style.cssText = `
            font-size: 0.75rem;
            font-weight: 600;
            color: #9ca3af;
            letter-spacing: 0.05em;
            text-align: ${aligns[index]};
          `;
          headers.appendChild(header);
        });
        
        const tickerList = document.createElement('div');
        tickerList.style.cssText = `
          display: flex;
          flex-direction: column;
          gap: 6px;
        `;
        
        data.forEach((ticker) => {
          const tickerRow = document.createElement('div');
          tickerRow.style.cssText = `
            display: grid;
            grid-template-columns: 50px 60px 120px 90px 120px;
            gap: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            padding: 8px 15px;
            align-items: center;
          `;
          
          // RANK
          const rank = document.createElement('div');
          rank.textContent = `#${ticker.rank}`;
          rank.style.cssText = `
            font-size: 0.9rem;
            font-weight: 600;
            color: #9ca3af;
            text-align: center;
          `;
          
          // TICKER
          const tickerSymbol = document.createElement('div');
          tickerSymbol.textContent = ticker.symbol;
          tickerSymbol.style.cssText = `
            font-size: 0.9rem;
            font-weight: 700;
            color: #ffffff;
            text-align: left;
          `;
          
          // NAME
          const name = document.createElement('div');
          name.textContent = ticker.fullName;
          name.style.cssText = `
            font-size: 0.8rem;
            color: #9ca3af;
            text-align: left;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `;
          
          // PRICE
          const bmsbText = ticker.price.includes('ABOVE') ? ' ABOVE' : ticker.price.includes('BELOW') ? ' BELOW' : '';
          const cleanPrice = ticker.price.replace('ABOVE', '').replace('BELOW', '');
          const priceEl = document.createElement('div');
          priceEl.textContent = cleanPrice;
          priceEl.style.cssText = `
            font-size: 0.8rem;
            color: #ffffff;
            font-weight: 600;
            text-align: left;
          `;
          
          // BMSB STATUS (combined text and indicator)
          const bmsbStatus = document.createElement('div');
          bmsbStatus.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          `;
          
          const bmsbText_el = document.createElement('span');
          bmsbText_el.textContent = bmsbText.trim();
          bmsbText_el.style.cssText = `
            font-size: 0.7rem;
            color: #9ca3af;
            font-weight: 500;
          `;
          
          const bmsbIndicator = document.createElement('div');
          bmsbIndicator.style.cssText = `
            background-color: ${ticker.bmsbColor};
            width: 14px;
            height: 14px;
            border-radius: 3px;
            border: 1px solid rgba(255, 255, 255, 0.2);
          `;
          
          bmsbStatus.appendChild(bmsbText_el);
          bmsbStatus.appendChild(bmsbIndicator);
          
          tickerRow.appendChild(rank);
          tickerRow.appendChild(tickerSymbol);
          tickerRow.appendChild(name);
          tickerRow.appendChild(priceEl);
          tickerRow.appendChild(bmsbStatus);
          tickerList.appendChild(tickerRow);
        });
        
        // Add compact market status section at bottom
        const marketStatusSection = document.createElement('div');
        marketStatusSection.style.cssText = `
          margin-top: 20px;
          padding: 15px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        `;
        
        const leftSection = document.createElement('div');
        leftSection.style.cssText = `
          display: flex;
          align-items: center;
          gap: 15px;
        `;
        
        const marketStatusTitle = document.createElement('div');
        marketStatusTitle.textContent = 'MARKET STATUS:';
        marketStatusTitle.style.cssText = `
          font-size: 0.9rem;
          font-weight: 600;
          color: #9ca3af;
          letter-spacing: 0.05em;
        `;
        
        const statusWithIcon = document.createElement('div');
        statusWithIcon.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
        `;
        
        const statusIcon = document.createElement('div');
        statusIcon.style.cssText = `
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: ${marketData.marketColor};
        `;
        
        const statusText = document.createElement('span');
        statusText.textContent = marketData.marketStatus;
        statusText.style.cssText = `
          font-size: 1.1rem;
          font-weight: 700;
          color: ${marketData.marketColor};
          letter-spacing: 0.05em;
        `;
        
        statusWithIcon.appendChild(statusIcon);
        statusWithIcon.appendChild(statusText);
        leftSection.appendChild(marketStatusTitle);
        leftSection.appendChild(statusWithIcon);
        
        const healthyWeakSection = document.createElement('div');
        healthyWeakSection.innerHTML = `<span style="color: #10b981; font-weight: 600; font-size: 0.8rem;">${marketData.healthyCount} HEALTHY</span> <span style="color: #9ca3af; font-weight: 400; font-size: 0.8rem;">|</span> <span style="color: #ef4444; font-weight: 600; font-size: 0.8rem;">${marketData.weakCount} WEAK</span>`;
        healthyWeakSection.style.cssText = `
          text-align: right;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 5px;
        `;
        
        marketStatusSection.appendChild(leftSection);
        marketStatusSection.appendChild(healthyWeakSection);
        
        container.appendChild(title);
        container.appendChild(headers);
        container.appendChild(tickerList);
        container.appendChild(marketStatusSection);
        document.body.appendChild(container);
      }, top10Data, marketStatusData);
      
      // Take a full viewport screenshot
      const screenshot = await page.screenshot({ 
        type: 'png',
        fullPage: false
      });
      
      return screenshot as Buffer;
      
    } catch (error) {
      console.error('Error capturing top 10 section:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
  
  /**
   * Capture a focused ticker view (highlighted ticker with context)
   */
  static async captureTickerFocus(baseUrl: string, symbol: string): Promise<Buffer> {
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
      
      await page.setViewport({
        width: 600,
        height: 300,
        deviceScaleFactor: 2
      });
      
      await page.goto(baseUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await page.waitForSelector('[id^="ticker-"]', { timeout: 15000 });
      
      // Style and focus on the specific ticker
      await page.evaluate((targetSymbol) => {
        const targetTicker = document.querySelector(`#ticker-${targetSymbol}`);
        
        if (targetTicker) {
          // Hide all other tickers
          const allTickers = document.querySelectorAll('[id^="ticker-"]');
          allTickers.forEach(ticker => {
            if (ticker !== targetTicker) {
              (ticker as HTMLElement).style.display = 'none';
            }
          });
          
          // Style the target ticker for focus
          const tickerEl = targetTicker as HTMLElement;
          tickerEl.style.background = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)';
          tickerEl.style.padding = '24px';
          tickerEl.style.borderRadius = '12px';
          tickerEl.style.border = '2px solid #10b981';
          tickerEl.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.3)';
          tickerEl.style.transform = 'scale(1.05)';
          
          // Add a title above
          const title = document.createElement('div');
          title.textContent = `📊 ${targetSymbol} Analysis`;
          title.style.color = 'white';
          title.style.fontSize = '18px';
          title.style.fontWeight = 'bold';
          title.style.textAlign = 'center';
          title.style.marginBottom = '16px';
          title.style.fontFamily = 'system-ui, -apple-system, sans-serif';
          
          tickerEl.parentElement?.insertBefore(title, tickerEl);
        }
      }, symbol);
      
      // Get the focused ticker container
      const focusedTicker = await page.evaluateHandle((targetSymbol) => {
        const ticker = document.querySelector(`#ticker-${targetSymbol}`);
        return ticker?.parentElement;
      }, symbol);
      
      if (focusedTicker) {
        const screenshot = await focusedTicker.screenshot({ 
          type: 'png',
          padding: 20
        });
        
        return screenshot as Buffer;
      } else {
        throw new Error(`Ticker ${symbol} not found`);
      }
      
    } catch (error) {
      console.error(`Error capturing ticker focus for ${symbol}:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Capture top 10 section and return both screenshot and tweet data
   */
  static async captureTop10WithData(baseUrl: string): Promise<{
    screenshot: Buffer;
    tweetData: {
      marketStatus: string;
      marketStatusEmoji: string;
      healthyCount: number;
      weakCount: number;
      healthyTokensTop10: string[];
    };
  }> {
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
      
      // Use Twitter portrait viewport (1080x1350 max)
      await page.setViewport({
        width: 540,
        height: 675, // Half of 1080x1350 for deviceScaleFactor: 2
        deviceScaleFactor: 2
      });
      
      await page.goto(baseUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      await page.waitForSelector('[id^="ticker-"]', { timeout: 15000 });
      
      // Get the top 10 tickers and create a clean layout
      const top10Data = await page.evaluate(() => {
        const tickers = document.querySelectorAll('[id^="ticker-"]');
        const top10 = Array.from(tickers).slice(0, 10);
        
        // Map of common crypto symbols to full names
        const cryptoNames = {
          'BTC': 'Bitcoin',
          'ETH': 'Ethereum', 
          'XRP': 'XRP',
          'BNB': 'BNB',
          'SOL': 'Solana',
          'TRX': 'TRON',
          'DOGE': 'Dogecoin',
          'ADA': 'Cardano',
          'HYPE': 'Hyperliquid',
          'BCH': 'Bitcoin Cash',
          'AVAX': 'Avalanche',
          'DOT': 'Polkadot',
          'LINK': 'Chainlink',
          'UNI': 'Uniswap',
          'LTC': 'Litecoin',
          'NEAR': 'NEAR Protocol',
          'APT': 'Aptos',
          'POL': 'Polygon',
          'PEPE': 'Pepe',
          'SUI': 'Sui'
        };
        
        return top10.map((ticker, index) => {
          // Extract symbol from the ticker ID (e.g., "ticker-BTC" -> "BTC")
          const tickerId = ticker.id;
          const symbol = tickerId.replace('ticker-', '');
          const fullName = cryptoNames[symbol] || symbol;
          
          // Find price element - look for price patterns
          const priceEl = ticker.querySelector('.text-right') || ticker.querySelector('[class*="price"]');
          let price = priceEl?.textContent?.trim() || '';
          
          // Clean up price to just show the dollar amount
          if (price.includes('$')) {
            price = price.split('$')[1]?.split(' ')[0] || price;
            price = '$' + price;
          }
          
          // Find BMSB status element
          const bmsbEl = ticker.querySelector('.bg-green-500, .bg-red-500, .bg-yellow-500, .bg-orange-500');
          const bmsbText = bmsbEl?.textContent?.trim() || '';
          const isHealthy = bmsbEl?.classList.contains('bg-green-500') || false;
          
          return {
            rank: index + 1,
            symbol: symbol,
            fullName: fullName,
            price: price,
            bmsb: bmsbText,
            bmsbColor: bmsbEl?.classList.contains('bg-green-500') ? '#10b981' :
                      bmsbEl?.classList.contains('bg-red-500') ? '#ef4444' :
                      bmsbEl?.classList.contains('bg-yellow-500') ? '#f59e0b' : '#f97316',
            isHealthy: isHealthy
          };
        });
      });
      
      // Get overall market status data
      const marketStatusData = await page.evaluate(() => {
        // Look for all text content in the page
        const allText = document.body.textContent || '';
        
        // Look for patterns like "20HEALTHY" or "80WEAK" (no space)
        const healthyMatch = allText.match(/(\d+)\s*HEALTHY/i);
        const weakMatch = allText.match(/(\d+)\s*WEAK/i);
        
        let healthyCount = 0;
        let weakCount = 0;
        
        if (healthyMatch) {
          healthyCount = parseInt(healthyMatch[1]);
        }
        
        if (weakMatch) {
          weakCount = parseInt(weakMatch[1]);
        }
        
        // Determine overall market status
        let marketStatus = 'BEARISH';
        let marketColor = '#ef4444';
        let marketEmoji = '🔴';
        
        if (healthyCount > weakCount) {
          marketStatus = 'BULLISH';
          marketColor = '#10b981';
          marketEmoji = '🟢';
        } else if (healthyCount === weakCount) {
          marketStatus = 'NEUTRAL';
          marketColor = '#f59e0b';
          marketEmoji = '🟡';
        }
        
        return { marketStatus, marketColor, marketEmoji, healthyCount, weakCount };
      });
      
      // Create an enhanced top 10 layout with market status
      await page.evaluate((data, marketData) => {
        // Clear the body and create layout
        document.body.innerHTML = '';
        
        const container = document.createElement('div');
        container.style.cssText = `
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          width: 100vw;
          height: 100vh;
          padding: 30px 20px 20px;
          font-family: system-ui, -apple-system, sans-serif;
          overflow: hidden;
          box-sizing: border-box;
        `;
        
        // Add title with chart emoji (external images don't load reliably in screenshots)
        const title = document.createElement('div');
        title.textContent = '📊 TOP 10 MARKET CAP';
        title.style.cssText = `
          font-size: 1.9rem;
          font-weight: 700;
          color: #ffffff;
          text-align: center;
          margin-bottom: 20px;
          letter-spacing: 0.05em;
        `;
        
        // Add column headers
        const headers = document.createElement('div');
        headers.style.cssText = `
          display: grid;
          grid-template-columns: 50px 60px 120px 90px 120px;
          gap: 8px;
          padding: 0 15px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 12px;
          align-items: center;
        `;
        
        const headers_list = ['RANK', 'TICKER', 'NAME', 'PRICE', 'BMSB STATUS'];
        const aligns = ['center', 'left', 'left', 'left', 'center'];
        
        headers_list.forEach((headerText, index) => {
          const header = document.createElement('div');
          header.textContent = headerText;
          header.style.cssText = `
            font-size: 0.75rem;
            font-weight: 600;
            color: #9ca3af;
            letter-spacing: 0.05em;
            text-align: ${aligns[index]};
          `;
          headers.appendChild(header);
        });
        
        const tickerList = document.createElement('div');
        tickerList.style.cssText = `
          display: flex;
          flex-direction: column;
          gap: 6px;
        `;
        
        data.forEach((ticker) => {
          const tickerRow = document.createElement('div');
          tickerRow.style.cssText = `
            display: grid;
            grid-template-columns: 50px 60px 120px 90px 120px;
            gap: 8px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            padding: 8px 15px;
            align-items: center;
          `;
          
          // RANK
          const rank = document.createElement('div');
          rank.textContent = `#${ticker.rank}`;
          rank.style.cssText = `
            font-size: 0.9rem;
            font-weight: 600;
            color: #9ca3af;
            text-align: center;
          `;
          
          // TICKER
          const tickerSymbol = document.createElement('div');
          tickerSymbol.textContent = ticker.symbol;
          tickerSymbol.style.cssText = `
            font-size: 0.9rem;
            font-weight: 700;
            color: #ffffff;
            text-align: left;
          `;
          
          // NAME
          const name = document.createElement('div');
          name.textContent = ticker.fullName;
          name.style.cssText = `
            font-size: 0.8rem;
            color: #9ca3af;
            text-align: left;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          `;
          
          // PRICE
          const bmsbText = ticker.price.includes('ABOVE') ? ' ABOVE' : ticker.price.includes('BELOW') ? ' BELOW' : '';
          const cleanPrice = ticker.price.replace('ABOVE', '').replace('BELOW', '');
          const priceEl = document.createElement('div');
          priceEl.textContent = cleanPrice;
          priceEl.style.cssText = `
            font-size: 0.8rem;
            color: #ffffff;
            font-weight: 600;
            text-align: left;
          `;
          
          // BMSB STATUS (combined text and indicator)
          const bmsbStatus = document.createElement('div');
          bmsbStatus.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          `;
          
          const bmsbText_el = document.createElement('span');
          bmsbText_el.textContent = bmsbText.trim();
          bmsbText_el.style.cssText = `
            font-size: 0.7rem;
            color: #9ca3af;
            font-weight: 500;
          `;
          
          const bmsbIndicator = document.createElement('div');
          bmsbIndicator.style.cssText = `
            background-color: ${ticker.bmsbColor};
            width: 14px;
            height: 14px;
            border-radius: 3px;
            border: 1px solid rgba(255, 255, 255, 0.2);
          `;
          
          bmsbStatus.appendChild(bmsbText_el);
          bmsbStatus.appendChild(bmsbIndicator);
          
          tickerRow.appendChild(rank);
          tickerRow.appendChild(tickerSymbol);
          tickerRow.appendChild(name);
          tickerRow.appendChild(priceEl);
          tickerRow.appendChild(bmsbStatus);
          tickerList.appendChild(tickerRow);
        });
        
        // Add compact market status section at bottom
        const marketStatusSection = document.createElement('div');
        marketStatusSection.style.cssText = `
          margin-top: 20px;
          padding: 15px 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        `;
        
        const leftSection = document.createElement('div');
        leftSection.style.cssText = `
          display: flex;
          align-items: center;
          gap: 15px;
        `;
        
        const marketStatusTitle = document.createElement('div');
        marketStatusTitle.textContent = 'MARKET STATUS:';
        marketStatusTitle.style.cssText = `
          font-size: 0.9rem;
          font-weight: 600;
          color: #9ca3af;
          letter-spacing: 0.05em;
        `;
        
        const statusWithIcon = document.createElement('div');
        statusWithIcon.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
        `;
        
        const statusIcon = document.createElement('div');
        statusIcon.style.cssText = `
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: ${marketData.marketColor};
        `;
        
        const statusText = document.createElement('span');
        statusText.textContent = marketData.marketStatus;
        statusText.style.cssText = `
          font-size: 1.1rem;
          font-weight: 700;
          color: ${marketData.marketColor};
          letter-spacing: 0.05em;
        `;
        
        statusWithIcon.appendChild(statusIcon);
        statusWithIcon.appendChild(statusText);
        leftSection.appendChild(marketStatusTitle);
        leftSection.appendChild(statusWithIcon);
        
        const healthyWeakSection = document.createElement('div');
        healthyWeakSection.innerHTML = `<span style="color: #10b981; font-weight: 600; font-size: 0.8rem;">${marketData.healthyCount} HEALTHY</span> <span style="color: #9ca3af; font-weight: 400; font-size: 0.8rem;">|</span> <span style="color: #ef4444; font-weight: 600; font-size: 0.8rem;">${marketData.weakCount} WEAK</span>`;
        healthyWeakSection.style.cssText = `
          text-align: right;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 5px;
        `;
        
        marketStatusSection.appendChild(leftSection);
        marketStatusSection.appendChild(healthyWeakSection);
        
        container.appendChild(title);
        container.appendChild(headers);
        container.appendChild(tickerList);
        container.appendChild(marketStatusSection);
        document.body.appendChild(container);
      }, top10Data, marketStatusData);
      
      // Take a full viewport screenshot
      const screenshot = await page.screenshot({ 
        type: 'png',
        fullPage: false
      });
      
      // Extract healthy tokens from top 10
      const healthyTokensTop10 = top10Data
        .filter(token => token.isHealthy)
        .map(token => `$${token.symbol}`);
      
      return {
        screenshot: screenshot as Buffer,
        tweetData: {
          marketStatus: marketStatusData.marketStatus,
          marketStatusEmoji: marketStatusData.marketEmoji,
          healthyCount: marketStatusData.healthyCount,
          weakCount: marketStatusData.weakCount,
          healthyTokensTop10: healthyTokensTop10
        }
      };
      
    } catch (error) {
      console.error('Error capturing top 10 section with data:', error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}