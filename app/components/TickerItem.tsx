import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Ticker } from '../types';
import TradingViewChart from './TradingViewChart';
import { formatSmallPriceWithSubscript } from '../../lib/price-formatter';

interface TickerItemProps {
  ticker: Ticker;
  index: number;
}

export const TickerItem: React.FC<TickerItemProps> = ({ ticker }) => {
  const [showChart, setShowChart] = useState(false);
  const [chartPosition, setChartPosition] = useState({ top: 0, left: 0, width: 420, height: 420 });
  const [isMobile, setIsMobile] = useState(false);
  const statusBoxRef = useRef<HTMLDivElement>(null);

  // Detect mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close chart when clicking outside on mobile
  React.useEffect(() => {
    if (!isMobile || !showChart) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      // Don't close if clicking on the status box or chart
      if (statusBoxRef.current?.contains(target) || 
          target.closest('.tradingview-chart-container')) {
        return;
      }
      setShowChart(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, showChart]);

  const updateChartPosition = () => {
    if (statusBoxRef.current) {
      const rect = statusBoxRef.current.getBoundingClientRect();
      const chartWidth = isMobile ? Math.min(320, window.innerWidth - 40) : 420;
      const chartHeight = isMobile ? 430 : 420;
      
      // Position the chart below the status box
      let top = rect.bottom + 8;
      let left = rect.left + (rect.width / 2) - (chartWidth / 2);
      
      // Mobile-specific positioning
      if (isMobile) {
        // Center the chart with padding on mobile
        left = (window.innerWidth - chartWidth) / 2;
        left = Math.max(20, Math.min(left, window.innerWidth - chartWidth - 20));
      } else {
        // Desktop positioning
        const maxLeft = window.innerWidth - chartWidth - 20;
        if (left > maxLeft) left = maxLeft;
        if (left < 20) left = 20;
      }
      
      // If chart would go below viewport, position it above the status box
      if (top + chartHeight > window.innerHeight - 20) {
        top = rect.top - chartHeight - 8;
        
        // If positioning above would go off the top, position it to fit within viewport
        if (top < 20) {
          top = Math.max(20, window.innerHeight - chartHeight - 20);
        }
      }
      
      setChartPosition({ top, left, width: chartWidth, height: chartHeight });
    }
  };
  // Determine status color based on BMSB band health
  const getStatusColor = () => {
    switch (ticker.band_health) {
      case 'healthy': return 'bg-green-500';
      case 'weak': return 'bg-red-500';
      default: return 'bg-red-500'; // Should not happen since we filter for complete data
    }
  };

  const getStatusShadow = () => {
    switch (ticker.band_health) {
      case 'healthy': return 'shadow-green-500/30';
      case 'weak': return 'shadow-red-500/30';
      default: return 'shadow-red-500/30'; // Should not happen since we filter for complete data
    }
  };

  const getPositionText = () => {
    if (!ticker.price_position) return 'NO DATA';
    switch (ticker.price_position) {
      case 'above_band': return 'ABOVE';
      case 'in_band': return 'IN BAND';
      case 'below_band': return 'BELOW';
      default: return 'UNKNOWN';
    }
  };

  const handleStatusBoxClick = () => {
    // On mobile, toggle the chart instead of opening TradingView
    if (isMobile) {
      if (showChart) {
        setShowChart(false);
      } else {
        updateChartPosition();
        setShowChart(true);
      }
      return;
    }
    
    // On desktop, open TradingView in new tab
    // Generate TradingView URL - use the custom symbol if available, otherwise fallback to symbol
    const tvSymbol = ticker.tradingview_symbol || `CRYPTO:${ticker.symbol}USD`;
    const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=${tvSymbol}`;
    
    // Open in new tab
    window.open(tradingViewUrl, '_blank', 'noopener,noreferrer');
  };

  
  return (
    <div 
      id={`ticker-${ticker.symbol}`}
      className="flex items-center bg-gray-900 border-b border-gray-800 hover:bg-gray-850 transition-colors duration-200"
    >
      {/* Ticker Content */}
      <div className="flex-1 px-2 py-0.5 sm:py-0.5 lg:py-0.75">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5">
            <span className={`text-gray-400 font-mono w-6 ${ticker.rank >= 100 ? 'text-[10px]' : 'text-xs'}`}>
              #{ticker.rank}
            </span>
            <div className="leading-tight">
              {/* Desktop and tablet: Symbol and name on separate lines */}
              <div className="hidden sm:block">
                <div className="text-white font-mono text-xs font-semibold">
                  {ticker.symbol}
                </div>
                <div className="text-gray-500 text-xs truncate max-w-32 leading-none">
                  {ticker.name}
                </div>
              </div>
              
              {/* Mobile single column: Symbol and name on same line */}
              <div className="sm:hidden">
                <div className="text-white font-mono text-sm font-semibold">
                  {ticker.symbol} <span className="text-gray-500 font-normal">{ticker.name}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-right leading-tight">
            <div className="text-white font-mono text-xs sm:text-sm">
              ${formatSmallPriceWithSubscript(ticker.price)}
            </div>
            <div className="text-xs font-mono leading-none text-gray-400">
              {getPositionText()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Status Box - BMSB Health Color with TradingView Chart */}
      <div 
        ref={statusBoxRef}
        className={`w-6 h-6 flex-shrink-0 mr-1.5 ${getStatusColor()} ${getStatusShadow()} shadow-md cursor-pointer hover:scale-110 transition-transform duration-200`}
        onMouseEnter={() => {
          // Only show chart on hover for desktop
          if (!isMobile) {
            updateChartPosition();
            setShowChart(true);
          }
        }}
        onMouseLeave={() => {
          // Only hide chart on mouse leave for desktop
          if (!isMobile) {
            setShowChart(false);
          }
        }}
        onClick={handleStatusBoxClick}
      >
      </div>
      
      {/* TradingView Chart Portal */}
      {showChart && typeof window !== 'undefined' && createPortal(
        <div 
          className="tradingview-chart-container fixed z-[1000] pointer-events-none"
          style={{
            top: `${chartPosition.top}px`,
            left: `${chartPosition.left}px`,
            width: `${chartPosition.width}px`,
            height: `${chartPosition.height}px`
          }}
        >
          <div className="bg-gray-900 rounded-lg shadow-2xl border border-gray-600 overflow-hidden w-full h-full">
            {/* TradingView Chart */}
            <div className="h-60"> {/* Increased height and added relative positioning */}
              <TradingViewChart 
                symbol={ticker.symbol} 
                tradingViewSymbol={ticker.tradingview_symbol}
              />
            </div>
            
            {/* BMSB Data Section */}
            <div className="p-3 bg-gray-900">
              <div className="text-white text-sm font-semibold mb-2">
                Bull Market Support Band Data
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* 20W SMA */}
                <div className="bg-gray-700 p-2 rounded">
                  <div className="text-gray-400 mb-1">20W SMA</div>
                  <div className="text-white font-mono">
                    {ticker.sma_20_week ? `$${formatSmallPriceWithSubscript(ticker.sma_20_week)}` : 'N/A'}
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-gray-400 mr-1">Trend:</span>
                    {ticker.sma_trend === 'increasing' ? (
                      <span className="text-green-400 flex items-center">
                        <span className="mr-1">↗</span>
                        Rising
                      </span>
                    ) : ticker.sma_trend === 'decreasing' ? (
                      <span className="text-red-400 flex items-center">
                        <span className="mr-1">↘</span>
                        Falling
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </div>
                </div>

                {/* 21W EMA */}
                <div className="bg-gray-700 p-2 rounded">
                  <div className="text-gray-400 mb-1">21W EMA</div>
                  <div className="text-white font-mono">
                    {ticker.ema_21_week ? `$${formatSmallPriceWithSubscript(ticker.ema_21_week)}` : 'N/A'}
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-gray-400 mr-1">Trend:</span>
                    {ticker.ema_trend === 'increasing' ? (
                      <span className="text-green-400 flex items-center">
                        <span className="mr-1">↗</span>
                        Rising
                      </span>
                    ) : ticker.ema_trend === 'decreasing' ? (
                      <span className="text-red-400 flex items-center">
                        <span className="mr-1">↘</span>
                        Falling
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Current Price, Position & Band Health */}
              <div className="mt-3 flex gap-8 text-xs">
                <div>
                  <span className="text-gray-400">Current Price: </span>
                  <div className="text-white font-mono font-semibold">
                    ${formatSmallPriceWithSubscript(ticker.price)}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Price Position: </span>
                  <div className={`font-semibold ${
                    ticker.price_position === 'above_band' ? 'text-green-400' :
                    ticker.price_position === 'below_band' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {ticker.price_position === 'above_band' ? 'Above Band' :
                     ticker.price_position === 'below_band' ? 'Below Band' :
                     ticker.price_position === 'in_band' ? 'In Band' : 'N/A'}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Band Health: </span>
                  <div className={`font-semibold ${
                    ticker.band_health === 'healthy' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {ticker.band_health === 'healthy' ? 'Healthy' : 'Weak'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};