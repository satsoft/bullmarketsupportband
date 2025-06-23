import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Ticker } from '../types';
import { formatSmallPriceWithSubscript } from '../../lib/price-formatter';
import TradingViewChart from './TradingViewChart';

interface FavoritesBarProps {
  tickers: Ticker[];
  onFavoriteClick: (ticker: Ticker) => void;
}

interface FavoriteTickerProps {
  ticker: Ticker;
  onTickerClick: (ticker: Ticker) => void;
  onRemove: (symbol: string, e: React.MouseEvent) => void;
}

const FavoriteTicker: React.FC<FavoriteTickerProps> = ({ ticker, onTickerClick, onRemove }) => {
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
      default: return 'bg-red-500';
    }
  };

  const getStatusShadow = () => {
    switch (ticker.band_health) {
      case 'healthy': return 'shadow-green-500/30';
      case 'weak': return 'shadow-red-500/30';
      default: return 'shadow-red-500/30';
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
    const tvSymbol = ticker.tradingview_symbol || `CRYPTO:${ticker.symbol}USD`;
    const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=${tvSymbol}`;
    window.open(tradingViewUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <button
        onClick={() => onTickerClick(ticker)}
        className="group flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded px-2 py-1 transition-colors flex-shrink-0"
      >
        <span className={`text-gray-400 font-mono text-[10px] w-4`}>
          #{ticker.rank}
        </span>
        <span className="text-white font-mono text-xs font-semibold">
          {ticker.symbol}
        </span>
        <span className="text-gray-500 font-mono text-[10px] hidden sm:inline">
          ${formatSmallPriceWithSubscript(ticker.price)}
        </span>
        <span className="text-gray-400 font-mono text-[9px] hidden md:inline">
          {getPositionText()}
        </span>
        
        {/* Status Box - BMSB Health Color with TradingView Chart */}
        <div 
          ref={statusBoxRef}
          className={`w-4 h-4 flex-shrink-0 ${getStatusColor()} ${getStatusShadow()} shadow-md cursor-pointer hover:scale-110 transition-transform duration-200`}
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
          onClick={(e) => {
            e.stopPropagation();
            handleStatusBoxClick();
          }}
        >
        </div>
        
        <button
          onClick={(e) => onRemove(ticker.symbol, e)}
          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all ml-1"
          title="Remove from favorites"
        >
          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </button>

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
            <div className="h-60">
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
    </>
  );
};

export const FavoritesBar: React.FC<FavoritesBarProps> = ({ tickers, onFavoriteClick }) => {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage
  const loadFavorites = useCallback(() => {
    const storedFavorites = JSON.parse(localStorage.getItem('cryptoFavorites') || '[]');
    setFavorites(storedFavorites);
  }, []);

  // Listen for favorites changes
  useEffect(() => {
    loadFavorites();
    
    const handleFavoritesChange = () => {
      loadFavorites();
    };

    window.addEventListener('favoritesChanged', handleFavoritesChange);
    return () => window.removeEventListener('favoritesChanged', handleFavoritesChange);
  }, [loadFavorites]);

  // Remove favorite
  const removeFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavorites = favorites.filter(fav => fav !== symbol);
    localStorage.setItem('cryptoFavorites', JSON.stringify(newFavorites));
    setFavorites(newFavorites);
    window.dispatchEvent(new CustomEvent('favoritesChanged'));
  };

  // Get ticker data for favorites
  const favoriteTickers = favorites
    .map(symbol => tickers.find(ticker => ticker.symbol === symbol))
    .filter(ticker => ticker !== undefined) as Ticker[];

  // Don't render the bar if no favorites
  if (favorites.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-2">
      <div className="flex items-center space-x-3 overflow-x-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700">
        {/* Star Icon */}
        <div className="flex-shrink-0 flex items-center space-x-1">
          <svg
            className="w-4 h-4 text-yellow-400 fill-current"
            viewBox="0 0 24 24"
          >
            <path
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          <span className="text-gray-400 text-xs font-semibold">FAVORITES</span>
        </div>

        {/* Favorite Tickers - Compact Single Line with Chart Functionality */}
        <div className="flex items-center space-x-2 min-w-0">
          {favoriteTickers.map((ticker) => (
            <FavoriteTicker
              key={ticker.symbol}
              ticker={ticker}
              onTickerClick={onFavoriteClick}
              onRemove={removeFavorite}
            />
          ))}
        </div>
      </div>
    </div>
  );
};