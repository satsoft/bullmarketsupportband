'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Ticker, BMSBApiResponse } from '../types';
import { TickerList } from './TickerList';
import { ExclusionTooltip } from './ExclusionTooltip';


export const Dashboard: React.FC = () => {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludedTokens, setExcludedTokens] = useState<Array<{symbol: string; category: string}>>([]);

  const fetchBMSBData = async () => {
    try {
      setError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for 100 cryptocurrencies
      
      const response = await fetch('/api/bmsb-data?limit=100', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: BMSBApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch BMSB data');
      }

      // Transform API data to match Ticker interface
      const transformedTickers: Ticker[] = data.data.map(item => ({
        id: item.id,
        symbol: item.symbol,
        name: item.name,
        price: item.price,
        change: 0, // Will be calculated from price movements over time
        changePercent: 0, // Will be calculated from price movements over time
        status: (item.band_health === 'healthy' ? 'up' : 'down') as 'up' | 'down',
        lastUpdate: new Date(),
        // BMSB fields
        rank: item.rank,
        sma_20_week: item.sma_20_week,
        ema_21_week: item.ema_21_week,
        support_band_lower: item.support_band_lower,
        support_band_upper: item.support_band_upper,
        price_position: item.price_position,
        sma_trend: item.sma_trend,
        ema_trend: item.ema_trend,
        band_health: item.band_health,
        is_stablecoin: false, // All tokens in this dashboard are non-stablecoins
        calculation_date: item.calculation_date,
        tradingview_symbol: item.tradingview_symbol
      }));

      setTickers(transformedTickers);
      setExcludedTokens(data.metadata.excluded_tokens || []);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load
    fetchBMSBData();
    
    // Update every 2 minutes for real data
    const interval = setInterval(() => {
      fetchBMSBData();
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  const healthyCount = tickers.filter(t => t.band_health === 'healthy').length;
  const weakCount = tickers.length - healthyCount; // Everything else is considered weak

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-2">
        {/* Desktop Header (md and up) */}
        <div className="hidden md:flex items-start space-x-2 sm:space-x-3">
          <Image 
            src="/logos/bullmarketsupportband.png" 
            alt="Bull Market Support Band Logo" 
            width={48} 
            height={48} 
            className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
          />
          <div className="flex-1 space-y-1">
            {/* Main Header Row */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-1 lg:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <h1 className="text-lg sm:text-xl font-bold text-white">BULL MARKET SUPPORT BAND</h1>
                <div className="hidden sm:block h-6 w-px bg-gray-700"></div>
                <div className="hidden sm:block text-sm text-gray-400">
                  CRYPTO MONITORING SYSTEM
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="text-xs sm:text-sm text-gray-400">MARKET STATUS</div>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${healthyCount > weakCount ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className={`text-xs sm:text-sm font-bold ${healthyCount > weakCount ? 'text-green-400' : 'text-red-400'}`}>
                      {healthyCount > weakCount ? 'BULLISH' : 'BEARISH'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-400 rounded-sm"></div>
                  <span className="text-green-400 font-semibold text-xs sm:text-sm">{healthyCount}</span>
                  <span className="text-gray-500 text-xs">HEALTHY</span>
                </div>
                
                
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-400 rounded-sm"></div>
                  <span className="text-red-400 font-semibold text-xs sm:text-sm">{weakCount}</span>
                  <span className="text-gray-500 text-xs">WEAK</span>
                </div>
              </div>
            </div>
            
            {/* Status Bar Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-gray-500 space-y-1 sm:space-y-0">
              <div className="flex items-center flex-wrap gap-4 sm:gap-6">
                <span>
                  <ExclusionTooltip excludedTokens={excludedTokens}>
                    <span className="border-b border-dotted border-gray-500 cursor-help">
                      TOP 100 CRYPTOS BY MARKET CAP<sup>*</sup>
                    </span>
                  </ExclusionTooltip>
                  {' • POWERED BY '}
                <a 
                    href="https://www.coingecko.com/en/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 transition-colors underline"
                  >
                    COINGECKO API
                  </a>
                  {' • BUILT BY '}
                  <a 
                    href="https://x.com/StableScarab" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors underline"
                  >
                    STABLESCARAB
                  </a>
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>SYSTEM OPERATIONAL</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Header (below md) */}
        <div className="md:hidden">
          <div className="flex items-start space-x-4">
            <Image 
              src="/logos/bullmarketsupportband.png" 
              alt="Bull Market Support Band Logo" 
              width={56} 
              height={56} 
              className="w-14 h-14 flex-shrink-0"
            />
            <div className="flex-1 space-y-0.5 text-left">
              {/* Line 1: BULL MARKET SUPPORT BAND */}
              <div className="text-white font-bold text-sm leading-tight">
                BULL MARKET SUPPORT BAND
              </div>
              
              {/* Line 2: MARKET STATUS BULLISH/BEARISH */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-xs">MARKET STATUS</span>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${healthyCount > weakCount ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className={`text-xs font-bold ${healthyCount > weakCount ? 'text-green-400' : 'text-red-400'}`}>
                    {healthyCount > weakCount ? 'BULLISH' : 'BEARISH'}
                  </span>
                </div>
              </div>
              
              {/* Line 3: HEALTHY COUNT WEAK COUNT */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-sm"></div>
                  <span className="text-green-400 font-semibold text-xs">{healthyCount}</span>
                  <span className="text-gray-500 text-xs">HEALTHY</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-400 rounded-sm"></div>
                  <span className="text-red-400 font-semibold text-xs">{weakCount}</span>
                  <span className="text-gray-500 text-xs">WEAK</span>
                </div>
              </div>
              
              {/* Line 4: TOP 100 CRYPTOS BY MARKET CAP */}
              <div className="text-gray-500 text-xs">
                <ExclusionTooltip excludedTokens={excludedTokens}>
                  <span className="border-b border-dotted border-gray-500 cursor-help">
                    TOP 100 CRYPTOS BY MARKET CAP<sup>*</sup>
                  </span>
                </ExclusionTooltip>
              </div>
              
              {/* Line 5: POWERED BY COINGECKO API */}
              <div className="text-gray-500 text-xs">
                POWERED BY{' '}
                <a 
                  href="https://www.coingecko.com/en/api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-orange-400 underline"
                >
                  COINGECKO API
                </a>
              </div>
              
              {/* Line 6: BUILT BY STABLESCARAB */}
              <div className="text-gray-500 text-xs">
                BUILT BY{' '}
                <a 
                  href="https://x.com/StableScarab" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 underline"
                >
                  STABLESCARAB
                </a>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive height */}
      <div className="h-[calc(100vh-160px)] md:h-[calc(100vh-80px)]">
        {/* Ticker List - Full Width */}
        <div className="h-full bg-gray-950">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
                <div className="text-gray-400">Loading BMSB data...</div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-red-400">
                <div className="text-lg font-bold mb-2">Error Loading Data</div>
                <div className="text-sm">{error}</div>
                <button 
                  onClick={fetchBMSBData}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <TickerList tickers={tickers} />
          )}
        </div>
      </div>
    </div>
  );
};