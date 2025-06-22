import React, { useEffect, useRef } from 'react';

interface TradingViewChartProps {
  symbol: string;
  tradingViewSymbol?: string;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({ symbol, tradingViewSymbol }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear any existing content
    container.innerHTML = '';

    // Special handling for specific symbols
    let chartSymbol = tradingViewSymbol;
    if (!chartSymbol) {
      switch (symbol) {
        case 'AB':
          chartSymbol = 'BITGET:ABUSDT';
          break;
        case 'SKY':
          chartSymbol = 'KUCOIN:SKYUSDT';
          break;
        case 'XMR':
          chartSymbol = 'CRYPTO:XMRUSD';
          break;
        case 'TKX':
          chartSymbol = 'TOKENIZE:TKXUSD';
          break;
        case 'GT':
          chartSymbol = 'CRYPTO:GTUSD';
          break;
        default:
          chartSymbol = `CRYPTO:${symbol}USD`;
      }
    }


    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: chartSymbol,
      interval: "1W",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      hide_top_toolbar: true,
      allow_symbol_change: false,
      save_image: false,
      studies: [
        { "id": "MASimple@tv-basicstudies", "inputs": { "length": 20 } },
        { "id": "MAExp@tv-basicstudies", "inputs": { "length": 21 } }
      ],
      hide_volume: true,
      support_host: "https://www.tradingview.com"
    });

    container.appendChild(script);

    // Cleanup function
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol, tradingViewSymbol]);

  return (
    <div 
      className="tradingview-widget-container" 
      ref={containerRef} 
      style={{ height: "100%", width: "100%" }}
    >
      <div 
        className="tradingview-widget-container__widget" 
        style={{ height: "calc(100% - 32px)", width: "100%" }}
      />
      <div className="tradingview-widget-copyright">
        <a 
          href="https://www.tradingview.com/" 
          rel="noopener nofollow" 
          target="_blank" 
          className="text-blue-400 text-xs"
        >
          <span>Track all markets on TradingView</span>
        </a>
      </div>
    </div>
  );
};

export default TradingViewChart;