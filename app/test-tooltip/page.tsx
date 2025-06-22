'use client';

import React from 'react';

export default function TestTooltip() {
  const sampleData = {
    btc: {
      symbol: "BTC",
      sma_20_week: 94565.81,
      ema_21_week: 94579.64,
      sma_trend: "increasing" as const,
      ema_trend: "flat" as const,
      band_health: "mixed" as const,
      is_stablecoin: false
    },
    usdt: {
      symbol: "USDT",
      sma_20_week: null,
      ema_21_week: null,
      sma_trend: null,
      ema_trend: null,
      band_health: "stablecoin" as const,
      is_stablecoin: true
    },
    eth: {
      symbol: "ETH",
      sma_20_week: 2480.47,
      ema_21_week: 2215.09,
      sma_trend: "decreasing" as const,
      ema_trend: "flat" as const,
      band_health: "mixed" as const,
      is_stablecoin: false
    }
  };

  const getStatusColor = (bandHealth: string, isStablecoin: boolean) => {
    if (isStablecoin) return 'bg-gray-500';
    switch (bandHealth) {
      case 'healthy': return 'bg-green-500';
      case 'mixed': return 'bg-yellow-500';
      case 'weak': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTrendIndicator = (sma_trend: string | null, ema_trend: string | null, is_stablecoin: boolean) => {
    if (is_stablecoin) return '◐';
    if (!sma_trend || !ema_trend) return '?';
    
    const smaUp = sma_trend === 'increasing';
    const emaUp = ema_trend === 'increasing';
    
    if (smaUp && emaUp) return '↗↗';
    if (!smaUp && !emaUp) return '↘↘';
    if (smaUp && !emaUp) return '↗↘';
    if (!smaUp && emaUp) return '↘↗';
    return '→→';
  };

  const getTooltipContent = (data: {
    is_stablecoin: boolean;
    sma_20_week: number | null;
    ema_21_week: number | null;
    sma_trend: string | null;
    ema_trend: string | null;
  }) => {
    if (data.is_stablecoin) {
      return 'Stablecoin - BMSB analysis not applicable';
    }
    
    if (!data.sma_20_week || !data.ema_21_week) {
      return 'Insufficient data for BMSB analysis';
    }

    const smaValue = data.sma_20_week;
    const emaValue = data.ema_21_week;
    const trendIcon = getTrendIndicator(data.sma_trend, data.ema_trend, data.is_stablecoin);
    
    if (smaValue >= emaValue) {
      return `20W SMA: $${smaValue.toFixed(2)}\n21W EMA: $${emaValue.toFixed(2)} ${trendIcon}`;
    } else {
      return `21W EMA: $${emaValue.toFixed(2)}\n20W SMA: $${smaValue.toFixed(2)} ${trendIcon}`;
    }
  };

  return (
    <div style={{ padding: '20px', backgroundColor: 'black', color: 'white', minHeight: '100vh' }}>
      <h1>Tooltip Test Page</h1>
      <p>Hover over the colored boxes to see BMSB tooltips:</p>
      
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        {Object.entries(sampleData).map(([key, data]) => (
          <div key={key} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            padding: '10px',
            border: '1px solid #444',
            borderRadius: '5px'
          }}>
            <span>{data.symbol}:</span>
            
            {/* Status Box with Tooltip */}
            <div 
              className={`w-6 h-6 ${getStatusColor(data.band_health, data.is_stablecoin)} cursor-help relative group shadow-md`}
              title={getTooltipContent(data)}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
                <div className="bg-gray-800 text-white text-xs rounded py-2 px-3 whitespace-pre-line shadow-lg border border-gray-600 min-w-max">
                  {getTooltipContent(data)}
                  {/* Arrow */}
                  <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            </div>
            
            <span style={{ fontSize: '12px', color: '#888' }}>
              ({data.band_health})
            </span>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#ccc' }}>
        <h3>Expected tooltip content:</h3>
        <ul>
          <li><strong>BTC (Mixed):</strong> EMA higher, so "21W EMA: $94579.64\n20W SMA: $94565.81 ↗→"</li>
          <li><strong>USDT (Stablecoin):</strong> "Stablecoin - BMSB analysis not applicable"</li>
          <li><strong>ETH (Mixed):</strong> SMA higher, so "20W SMA: $2480.47\n21W EMA: $2215.09 ↘→"</li>
        </ul>
      </div>
    </div>
  );
}