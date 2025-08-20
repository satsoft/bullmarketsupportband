'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Ticker, BMSBApiResponse } from '../types';
import { TickerList } from './TickerList';
import { TickerItem } from './TickerItem';
import { ExclusionTooltip } from './ExclusionTooltip';
import { BMSBTooltip } from './BMSBTooltip';
import { FavoritesBar } from './FavoritesBar';
import { consentManager } from '../../lib/consent';
import { ConsentProvider } from './GlobalConsentManager';

export const Dashboard: React.FC = () => {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [excludedTokens, setExcludedTokens] = useState<Array<{symbol: string; category: string}>>([]);
  
  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [hasFavorites, setHasFavorites] = useState(false);

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


  // Search filtering - only search through displayed tickers
  const filteredCryptos = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    return tickers.filter(ticker => 
      ticker.symbol.toLowerCase().includes(term) || 
      ticker.name.toLowerCase().includes(term)
    ).slice(0, 8); // Limit to 8 results for compact display
  }, [searchTerm, tickers]);

  // Mobile ticker filtering - when searching on mobile, show only matching tickers
  const displayTickers = useMemo(() => {
    // On mobile with active search, show only matching tickers (no limit)
    if (isMobileView && searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return tickers.filter(ticker => 
        ticker.symbol.toLowerCase().includes(term) || 
        ticker.name.toLowerCase().includes(term)
      );
    }
    // Default: show all tickers
    return tickers;
  }, [searchTerm, tickers, isMobileView]);

  // Handle search term changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    // Only show dropdown on desktop, not on mobile where we filter the main list
    setShowSearchDropdown(value.length > 0 && !isMobileView);
  }, [isMobileView]);

  // Handle crypto selection
  const handleCryptoSelect = useCallback((ticker: Ticker) => {
    // Highlight the selected ticker
    const element = document.getElementById(`ticker-${ticker.symbol}`);
    if (element) {
      // Highlight the entire card briefly with inset ring
      element.classList.add('!bg-yellow-400/20', 'ring-2', 'ring-inset', 'ring-yellow-400');
      setTimeout(() => {
        element.classList.remove('!bg-yellow-400/20', 'ring-2', 'ring-inset', 'ring-yellow-400');
      }, 2000);
    }
    
    // On desktop, clear search immediately
    // On mobile, keep search persistent - only clear when user clicks search bar again
    if (!isMobileView) {
      setSearchTerm('');
    }
    setShowSearchDropdown(false);
  }, [isMobileView]);

  // Handle Enter key press
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredCryptos.length === 1) {
      handleCryptoSelect(filteredCryptos[0]);
    }
  }, [filteredCryptos, handleCryptoSelect]);

  // Handle search bar focus - on mobile, clear search if there's an existing search
  const handleSearchFocus = useCallback(() => {
    if (isMobileView && searchTerm.trim()) {
      setSearchTerm('');
    }
    // Show dropdown on desktop when focusing
    if (!isMobileView && searchTerm) {
      setShowSearchDropdown(true);
    }
  }, [isMobileView, searchTerm]);

  // Handle favorite click - scroll to ticker and highlight
  const handleFavoriteClick = useCallback((ticker: Ticker) => {
    handleCryptoSelect(ticker);
  }, [handleCryptoSelect]);

  // Check for favorites on mount and when favorites change
  const checkFavorites = useCallback(() => {
    const favorites = consentManager.getFavorites();
    setHasFavorites(favorites.length > 0);
  }, []);

  // Listen for favorites changes
  useEffect(() => {
    checkFavorites();
    
    const handleFavoritesChange = () => {
      checkFavorites();
    };

    const handleConsentRevoked = () => {
      setHasFavorites(false);
    };

    window.addEventListener('favoritesChanged', handleFavoritesChange);
    window.addEventListener('consentRevoked', handleConsentRevoked);
    
    return () => {
      window.removeEventListener('favoritesChanged', handleFavoritesChange);
      window.removeEventListener('consentRevoked', handleConsentRevoked);
    };
  }, [checkFavorites]);

  useEffect(() => {
    // Initial load
    fetchBMSBData();
    
    // Update every 2 minutes for real data
    const interval = setInterval(() => {
      fetchBMSBData();
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  // Track mobile view for search filtering
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 640); // sm breakpoint
    };
    
    // Initial check
    checkMobileView();
    
    // Listen for resize events
    window.addEventListener('resize', checkMobileView);
    
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  const healthyCount = tickers.filter(t => t.band_health === 'healthy').length;
  const weakCount = tickers.length - healthyCount; // Everything else is considered weak

  return (
    <ConsentProvider>
      <div className="min-h-screen bg-black text-white font-mono">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-1.5">
        {/* Desktop Header (md and up) */}
        <div className="hidden md:flex items-start space-x-2 sm:space-x-3">
          <Image 
            src="/logos/bullmarketsupportband.png" 
            alt="Bull Market Support Band Logo" 
            width={56} 
            height={56} 
            className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 flex-shrink-0"
            style={{ filter: 'none' }}
          />
          <div className="flex-1 space-y-1">
            {/* Main Header Row - More compact for ad space */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between space-y-1 lg:space-y-0">
              <div className="flex flex-col lg:flex-row lg:items-center space-y-0.5 lg:space-y-0 lg:space-x-2 sm:space-x-4">
                <div className="flex items-center space-x-2">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">BULL MARKET SUPPORT BAND</h1>
                  <BMSBTooltip>
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-gray-400 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors cursor-pointer">
                      <span className="text-[10px] sm:text-xs font-bold">i</span>
                    </div>
                  </BMSBTooltip>
                </div>
                <div className="hidden lg:block h-4 w-px bg-gray-700"></div>
                <div className="text-xs text-gray-400">
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
            
            {/* Status Bar and Ad Row - Allow ad to span full vertical space */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between xl:gap-6 text-xs text-gray-500 space-y-2 xl:space-y-0 mt-1">
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
              
              {/* Desktop Sponsor Ad - Spans upward into first row without affecting spacing */}
              <div className="hidden xl:flex justify-center items-end flex-1 px-4 relative">
                <a 
                  href="https://app.lighter.xyz/trade/ETH?referral=RUE3SCRR9YZ2" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute bottom-0 transform translate-y-1 2xl:translate-y-2"
                >
                  <Image 
                    src="/LIGHTER_AD.png" 
                    alt="Lighter - Trade perpetuals with unmatched efficiency and fairness. Zero fees, #2 perp volume airdrop soon. Invite-only." 
                    width={552} 
                    height={60} 
                    className="h-16 2xl:h-20 w-auto max-w-full object-contain"
                    priority
                  />
                </a>
                {/* Invisible spacer to maintain row height */}
                <div className="h-6 w-full opacity-0"></div>
              </div>
              
              {/* Medium screens ad - larger version */}
              <div className="hidden md:flex xl:hidden justify-center flex-1 px-2">
                <a 
                  href="https://app.lighter.xyz/trade/ETH?referral=RUE3SCRR9YZ2" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Image 
                    src="/LIGHTER_AD.png" 
                    alt="Lighter - Trade perpetuals with unmatched efficiency and fairness. Zero fees, #2 perp volume airdrop soon. Invite-only." 
                    width={552} 
                    height={60} 
                    className="h-20 lg:h-24 w-auto max-w-full object-contain"
                    priority
                  />
                </a>
              </div>
              
              <div className="flex items-center space-x-4 flex-shrink-0">
                {/* Desktop Search Bar */}
                <div className="relative">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={handleSearchFocus}
                      onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                      placeholder="Search cryptos..."
                      className="w-48 lg:w-64 pl-10 pr-3 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400"
                    />
                  </div>
                  
                  {/* Desktop Search Dropdown */}
                  {showSearchDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 max-h-64 overflow-y-auto">
                      {filteredCryptos.length > 0 ? (
                        <>
                          <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700">
                            {filteredCryptos.length} result{filteredCryptos.length === 1 ? '' : 's'}
                          </div>
                          {filteredCryptos.map((ticker) => (
                            <div key={ticker.id} className="border-b border-gray-700 last:border-b-0">
                              <TickerItem 
                                ticker={ticker} 
                                index={0} 
                                showFavoritesStar={true}
                              />
                            </div>
                          ))}
                        </>
                      ) : searchTerm.length > 0 ? (
                        <div className="px-3 py-4 text-center text-gray-400">
                          <div className="text-sm">No matches found</div>
                          <div className="text-xs mt-1">
                            "{searchTerm}" not in displayed cryptocurrencies
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>SYSTEM OPERATIONAL</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Header (below md) */}
        <div className="md:hidden space-y-1.5">
          {/* Top Row: BULL MARKET SUPPORT BAND - Left Aligned */}
          <div className="flex items-center space-x-2">
            <div className="text-white font-bold text-xl leading-tight">
              BULL MARKET SUPPORT BAND
            </div>
            <BMSBTooltip>
              <div className="w-3 h-3 rounded-full border border-gray-400 flex items-center justify-center text-gray-400 hover:text-white hover:border-white transition-colors cursor-pointer">
                <span className="text-[10px] font-bold">i</span>
              </div>
            </BMSBTooltip>
          </div>
          
          {/* Bottom Row: Logo Left, Content Right */}
          <div className="flex items-start space-x-4">
            <Image 
              src="/logos/bullmarketsupportband.png" 
              alt="Bull Market Support Band Logo" 
              width={56} 
              height={56} 
              className="w-14 h-14 flex-shrink-0"
              style={{ filter: 'none' }}
            />
            <div className="flex-1 space-y-0.5 text-left">
              {/* Line 1: MARKET STATUS BULLISH/BEARISH */}
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">MARKET STATUS</span>
                <div className="flex items-center space-x-1">
                  <div className={`w-2 h-2 rounded-full ${healthyCount > weakCount ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className={`text-sm font-bold ${healthyCount > weakCount ? 'text-green-400' : 'text-red-400'}`}>
                    {healthyCount > weakCount ? 'BULLISH' : 'BEARISH'}
                  </span>
                </div>
              </div>
              
              {/* Line 2: HEALTHY COUNT WEAK COUNT */}
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
              
              {/* Line 3: TOP 100 CRYPTOS BY MARKET CAP */}
              <div className="text-gray-500 text-xs">
                <ExclusionTooltip excludedTokens={excludedTokens}>
                  <span className="border-b border-dotted border-gray-500 cursor-help">
                    TOP 100 CRYPTOS BY MARKET CAP<sup>*</sup>
                  </span>
                </ExclusionTooltip>
              </div>
              
              {/* Line 4: POWERED BY COINGECKO API */}
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
              
              {/* Line 5: BUILT BY STABLESCARAB */}
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
          
          {/* Mobile Search Bar */}
          <div className="mt-2 relative">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleSearchFocus}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                placeholder="Search cryptos..."
                className="w-full pl-10 pr-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400"
              />
            </div>
            
            {/* Mobile Search Dropdown */}
            {showSearchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded shadow-lg z-50 max-h-64 overflow-y-auto">
                {filteredCryptos.length > 0 ? (
                  <>
                    <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700">
                      {filteredCryptos.length} result{filteredCryptos.length === 1 ? '' : 's'}
                    </div>
                    {filteredCryptos.map((ticker) => (
                      <div key={ticker.id} className="border-b border-gray-700 last:border-b-0">
                        <TickerItem 
                          ticker={ticker} 
                          index={0} 
                          showFavoritesStar={true}
                        />
                      </div>
                    ))}
                  </>
                ) : searchTerm.length > 0 ? (
                  <div className="px-3 py-4 text-center text-gray-400">
                    <div className="text-sm">No matches found</div>
                    <div className="text-xs mt-1">
                      "{searchTerm}" not in displayed cryptocurrencies
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sponsor Ad - Outside header container for full width */}
      <div className="md:hidden bg-gray-900 border-b border-gray-800 py-4">
        <a 
          href="https://app.lighter.xyz/trade/ETH?referral=RUE3SCRR9YZ2" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <Image 
            src="/LIGHTER_AD.png" 
            alt="Lighter - Trade perpetuals with unmatched efficiency and fairness. Zero fees, #2 perp volume airdrop soon. Invite-only." 
            width={1000} 
            height={120} 
            className="h-24 sm:h-28 w-screen object-contain"
            priority
          />
        </a>
      </div>

      {/* Favorites Bar */}
      <FavoritesBar 
        tickers={tickers} 
        onFavoriteClick={handleFavoriteClick}
      />

      {/* Main Content - Responsive height */}
      <div className={`${hasFavorites 
        ? 'h-[calc(100vh-230px)] md:h-[calc(100vh-132px)]' 
        : 'h-[calc(100vh-190px)] md:h-[calc(100vh-92px)]'
      }`}>
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
            <TickerList 
              tickers={displayTickers} 
              showFavoritesStar={isMobileView && searchTerm.trim().length > 0}
            />
          )}
        </div>
      </div>
      </div>
    </ConsentProvider>
  );
};