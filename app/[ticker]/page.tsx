'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import TradingViewChart from '../components/TradingViewChart';
import { Ticker } from '../types';

export default function TickerPage() {
  const params = useParams();
  const ticker = params.ticker as string;
  const [tickerData, setTickerData] = useState<Ticker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to format small prices with subscript notation
  const formatSmallPriceWithSubscript = (price: number): string => {
    if (price >= 1) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    
    // For prices < 1, use scientific notation with subscript
    const str = price.toExponential(2);
    const [coefficient, exponent] = str.split('e');
    const exp = parseInt(exponent);
    
    if (exp >= -3) {
      // For small numbers that don't need subscript, show normal decimal
      return price.toFixed(Math.abs(exp) + 2);
    }
    
    // Format with subscript for very small numbers
    return `${parseFloat(coefficient).toFixed(2)}₁₀^${exp}`;
  };

  useEffect(() => {
    const fetchTickerData = async () => {
      try {
        const response = await fetch('/api/bmsb-data');
        const data = await response.json();
        
        const foundTicker = data.data.find((t: Ticker) => 
          t.symbol.toLowerCase() === ticker.toLowerCase()
        );
        
        if (foundTicker) {
          setTickerData(foundTicker);
        } else {
          setError(`Ticker ${ticker.toUpperCase()} not found`);
        }
      } catch {
        setError('Failed to load ticker data');
      } finally {
        setLoading(false);
      }
    };

    if (ticker) {
      fetchTickerData();
    }
  }, [ticker]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading {ticker?.toUpperCase()} chart...</p>
        </div>
      </div>
    );
  }

  if (error || !tickerData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Error</h1>
          <p className="text-white">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      {/* Ticker Info Header */}
      <div className="text-center mb-4">
        <h1 className="text-3xl font-bold text-white mb-3">
          {tickerData.symbol} - {tickerData.name}
        </h1>
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-base font-semibold ${
          tickerData.band_health === 'healthy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          <div className={`w-3 h-3 rounded-full mr-2 ${
            tickerData.band_health === 'healthy' ? 'bg-green-500' : 'bg-red-500'
          }`}></div>
          BMSB Status: {tickerData.band_health?.toUpperCase()}
        </div>
      </div>

      {/* Chart Popup Container - Replicating the exact popup design */}
      <div className="max-w-sm mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-700">
          {/* TradingView Chart Section */}
          <div className="bg-gray-800 h-64">
            <TradingViewChart 
              symbol={tickerData.symbol} 
              tradingViewSymbol={tickerData.tradingview_symbol}
            />
          </div>
          
          {/* BMSB Data Section */}
          <div className="p-4 bg-gray-900">
            <div className="text-white text-base font-semibold mb-3">
              Bull Market Support Band Data
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              {/* 20W SMA */}
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-gray-400 mb-1">20W SMA</div>
                <div className="text-white font-mono">
                  {tickerData.sma_20_week ? `$${formatSmallPriceWithSubscript(tickerData.sma_20_week)}` : 'N/A'}
                </div>
                <div className="flex items-center mt-1">
                  <span className="text-gray-400 mr-1">Trend:</span>
                  {tickerData.sma_trend === 'increasing' ? (
                    <span className="text-green-400 flex items-center">
                      <span className="mr-1">↗</span>
                      Rising
                    </span>
                  ) : tickerData.sma_trend === 'decreasing' ? (
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
              <div className="bg-gray-700 p-3 rounded">
                <div className="text-gray-400 mb-1">21W EMA</div>
                <div className="text-white font-mono">
                  {tickerData.ema_21_week ? `$${formatSmallPriceWithSubscript(tickerData.ema_21_week)}` : 'N/A'}
                </div>
                <div className="flex items-center mt-1">
                  <span className="text-gray-400 mr-1">Trend:</span>
                  {tickerData.ema_trend === 'increasing' ? (
                    <span className="text-green-400 flex items-center">
                      <span className="mr-1">↗</span>
                      Rising
                    </span>
                  ) : tickerData.ema_trend === 'decreasing' ? (
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
            <div className="mt-4 flex gap-6 text-sm">
              <div>
                <span className="text-gray-400">Current Price: </span>
                <div className="text-white font-mono font-semibold">
                  ${formatSmallPriceWithSubscript(tickerData.price)}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Price Position: </span>
                <div className={`font-semibold ${
                  tickerData.price_position === 'above_band' ? 'text-green-400' :
                  tickerData.price_position === 'below_band' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {tickerData.price_position === 'above_band' ? 'Above Band' :
                   tickerData.price_position === 'below_band' ? 'Below Band' :
                   tickerData.price_position === 'in_band' ? 'In Band' : 'N/A'}
                </div>
              </div>
              <div>
                <span className="text-gray-400">Band Health: </span>
                <div className={`font-semibold ${
                  tickerData.band_health === 'healthy' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {tickerData.band_health === 'healthy' ? 'Healthy' : 'Weak'}
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}