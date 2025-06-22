'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ExclusionTooltipProps {
  children: React.ReactNode;
  excludedTokens: Array<{
    symbol: string;
    category: string;
  }>;
}

export const ExclusionTooltip: React.FC<ExclusionTooltipProps> = ({ children, excludedTokens }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, width: 400 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const updateTooltipPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const isMobile = window.innerWidth < 768;
    const tooltipWidth = isMobile ? Math.min(300, window.innerWidth - 40) : 400;
    const tooltipHeight = 300;
    
    // Position directly below the trigger element
    let top = rect.bottom + 5;
    let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
    
    // Mobile-specific positioning
    if (isMobile) {
      // Center on mobile with padding
      left = (window.innerWidth - tooltipWidth) / 2;
      left = Math.max(20, Math.min(left, window.innerWidth - tooltipWidth - 20));
    } else {
      // Desktop positioning
      const maxLeft = window.innerWidth - tooltipWidth - 20;
      if (left > maxLeft) left = maxLeft;
      if (left < 20) left = 20;
    }
    
    // If tooltip would go below viewport, position it above
    if (top + tooltipHeight > window.innerHeight - 20) {
      top = rect.top - tooltipHeight - 5;
      if (top < 20) {
        top = Math.max(20, window.innerHeight - tooltipHeight - 20);
      }
    }
    
    setTooltipPosition({ top, left, width: tooltipWidth });
  };

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!showTooltip) {
      const element = event.currentTarget;
      updateTooltipPosition(element);
      setShowTooltip(true);
    } else {
      setShowTooltip(false);
    }
  }, [showTooltip]);

  // Close tooltip when clicking outside
  useEffect(() => {
    if (!showTooltip) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTooltip]);

  // Simple 3-category system
  const simplifiedCategories = {
    'insufficient_data': 'Insufficient Market Data (< 21 weeks)',
    'stablecoins': 'Stablecoins', 
    'derivatives': 'Wrapped/Bridged/Staking Tokens'
  };

  // Map all exclusion reasons to the 3 main categories
  const categoryMapping: Record<string, string> = {
    'insufficient_data': 'insufficient_data',
    'explicit_stablecoins': 'stablecoins',
    'database_stablecoin': 'stablecoins',
    'explicit_wrapped': 'derivatives',
    'pattern_wrapped': 'derivatives',
    'explicit_crossChain': 'derivatives',
    'explicit_liquidStaking': 'derivatives',
    'pattern_liquidStaking': 'derivatives',
    'pattern_staked': 'derivatives',
    'explicit_liquidRestaking': 'derivatives',
    'pattern_bridge': 'derivatives',
    'pattern_vault': 'derivatives',
    'explicit_synthetic': 'derivatives',
    'explicit_database_exclusion': 'derivatives',
    'name_filter': 'derivatives'
  };

  // Group tokens by simplified categories
  const simplifiedGroupedTokens = excludedTokens.reduce((acc, token) => {
    const simplifiedCategory = categoryMapping[token.category] || 'derivatives';
    if (!acc[simplifiedCategory]) {
      acc[simplifiedCategory] = [];
    }
    acc[simplifiedCategory].push(token.symbol);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <>
      <span
        ref={triggerRef}
        onClick={handleClick}
        className="relative cursor-pointer"
      >
        {children}
      </span>
      
      {showTooltip && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed z-[2000] pointer-events-auto"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            width: `${tooltipPosition.width}px`
          }}
        >
          <div className="bg-gray-800 rounded-lg shadow-2xl border border-gray-600 overflow-hidden max-h-80">
            {/* Header */}
            <div className="bg-gray-700 px-4 py-2 border-b border-gray-600">
              <h3 className="text-white text-sm font-semibold">Excluded Tokens</h3>
              <p className="text-gray-300 text-xs">
                {excludedTokens.length} tokens excluded from TOP 100
              </p>
            </div>
            
            {/* Content */}
            <div className="p-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              {excludedTokens.length === 0 ? (
                <div className="text-gray-400 text-sm text-center py-4">
                  No exclusion data available
                </div>
              ) : (
                // Display in order: insufficient_data, stablecoins, derivatives
                ['insufficient_data', 'stablecoins', 'derivatives'].map(categoryKey => {
                  const tokens = simplifiedGroupedTokens[categoryKey];
                  if (!tokens || tokens.length === 0) return null;

                  return (
                    <div key={categoryKey} className="mb-3 last:mb-0">
                      <div className="text-xs font-medium text-gray-400 mb-2">
                        {simplifiedCategories[categoryKey]} ({tokens.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tokens.map(token => (
                          <span
                            key={token}
                            className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded font-mono"
                          >
                            {token}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};