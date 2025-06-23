'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface BMSBTooltipProps {
  children: React.ReactNode;
}

export const BMSBTooltip: React.FC<BMSBTooltipProps> = ({ children }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, width: 400 });
  const triggerRef = useRef<HTMLSpanElement>(null);

  const updateTooltipPosition = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const isMobile = window.innerWidth < 768;
    const tooltipWidth = isMobile ? Math.min(300, window.innerWidth - 40) : 400;
    
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
    
    // Ensure tooltip doesn't go below viewport
    const maxTop = window.innerHeight - 20;
    if (top > maxTop) {
      top = rect.top - 5; // Position above instead
      if (top < 20) {
        top = 20; // Minimum top position
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
              <h3 className="text-white text-sm font-semibold">Bull Market Support Band</h3>
            </div>
            
            {/* Content */}
            <div className="p-4 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
              <div className="text-sm text-gray-300 leading-relaxed space-y-3">
                <p>
                  The Bull Market Support Band is a key technical indicator that combines the <strong className="text-white">20-week Simple Moving Average (SMA)</strong> and <strong className="text-white">21-week Exponential Moving Average (EMA)</strong>.
                </p>
                
                <div>
                  <p className="text-white font-medium mb-1">Why it matters:</p>
                  <p>This band has shown strong support during bull markets, helping identify potential buying opportunities and trend reversals. When price holds above the band, it typically indicates continued bullish momentum.</p>
                </div>
                
                <div>
                  <p className="text-white font-medium mb-1">Calculation:</p>
                  <p>The band is formed by plotting the 20-week SMA and 21-week EMA together, creating a support zone between these moving averages.</p>
                </div>
                
                <div>
                  <p className="text-white font-medium mb-1">Color coding:</p>
                  <p><span className="text-green-400 font-semibold">Green boxes</span> indicate when both moving averages that make up the band are trending up, while <span className="text-red-400 font-semibold">red boxes</span> show when one or both are trending down.</p>
                </div>
                
                <div>
                  <p className="text-white font-medium mb-1">Updates:</p>
                  <p>Price data and calculations are updated every 5 minutes to provide real-time market insights.</p>
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