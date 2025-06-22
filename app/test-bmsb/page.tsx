'use client';

import React, { useState, useEffect } from 'react';

interface WeeklyData {
  weekStart: string;
  weekEnd: string;
  closingPrice: number;
  isCurrentWeek: boolean;
}

interface BMSBCalculation {
  weeklyData: WeeklyData[];
  sma20Previous: number;
  ema21Previous: number;
  sma20Current: number;
  ema21Current: number;
  currentPrice: number;
  smaTrend: 'increasing' | 'decreasing';
  emaTrend: 'increasing' | 'decreasing';
  supportBandLower: number;
  supportBandUpper: number;
  pricePosition: 'above_band' | 'in_band' | 'below_band';
  bandHealth: 'healthy' | 'weak';
}

export default function TestBMSBPage() {
  const [calculation, setCalculation] = useState<BMSBCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBitcoinBMSB();
  }, []);

  const fetchBitcoinBMSB = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/test-bmsb-bitcoin');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to calculate BMSB');
      }
      
      setCalculation(data.calculation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Bitcoin BMSB Calculation Test</h1>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <div>Loading Bitcoin BMSB data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Bitcoin BMSB Calculation Test</h1>
          <div className="bg-red-900 border border-red-600 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
            <p className="text-red-300">{error}</p>
            <button 
              onClick={fetchBitcoinBMSB}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!calculation) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Bitcoin BMSB Calculation Test</h1>
          <div className="text-center text-gray-400">No calculation data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Bitcoin BMSB Calculation Test</h1>
        
        {/* Current Price */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Current Bitcoin Price</h2>
          <div className="text-3xl font-mono text-yellow-400">
            ${calculation.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Weekly Data Table */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">21 Weeks of Closing Prices (Monday-Sunday UTC)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-600">
                  <th className="text-left p-2">Week #</th>
                  <th className="text-left p-2">Period</th>
                  <th className="text-right p-2">Closing Price</th>
                  <th className="text-left p-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {calculation.weeklyData.map((week, index) => (
                  <tr 
                    key={index} 
                    className={`border-b border-gray-700 ${week.isCurrentWeek ? 'bg-yellow-900/30' : ''}`}
                  >
                    <td className="p-2 font-mono">{index + 1}</td>
                    <td className="p-2 font-mono text-xs">
                      {week.weekStart} to {week.weekEnd}
                    </td>
                    <td className="p-2 font-mono text-right">
                      ${week.closingPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-2 text-xs">
                      {week.isCurrentWeek ? (
                        <span className="text-yellow-400">Current Week (Live Price)</span>
                      ) : (
                        <span className="text-gray-400">Week Close</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculations */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* SMA Calculation */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">20-Week Simple Moving Average</h2>
            
            <div className="mb-4">
              <h3 className="font-semibold text-blue-400 mb-2">Previous SMA (weeks 2-21)</h3>
              <div className="text-sm text-gray-300 mb-2">
                Sum of 20 weekly closes ÷ 20
              </div>
              <div className="font-mono text-lg mb-2">
                ${calculation.sma20Previous.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="bg-gray-700 p-2 rounded text-xs">
                <div className="text-gray-400 mb-1">📋 Copy to Google Calculator:</div>
                <div className="font-mono text-green-300 break-all select-all cursor-pointer" 
                     onClick={() => navigator.clipboard.writeText(`(${calculation.weeklyData.slice(1, 21).map(w => w.closingPrice.toFixed(2)).join(' + ')}) / 20`)}>
                  ({calculation.weeklyData.slice(1, 21).map(w => w.closingPrice.toFixed(2)).join(' + ')}) / 20
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold text-green-400 mb-2">Current SMA (weeks 3-22)</h3>
              <div className="text-sm text-gray-300 mb-2">
                Sum of 20 weekly closes ÷ 20 (including current week)
              </div>
              <div className="font-mono text-lg mb-2">
                ${calculation.sma20Current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="bg-gray-700 p-2 rounded text-xs">
                <div className="text-gray-400 mb-1">📋 Copy to Google Calculator:</div>
                <div className="font-mono text-green-300 break-all select-all cursor-pointer"
                     onClick={() => navigator.clipboard.writeText(`(${calculation.weeklyData.slice(2, 22).map(w => w.closingPrice.toFixed(2)).join(' + ')}) / 20`)}>
                  ({calculation.weeklyData.slice(2, 22).map(w => w.closingPrice.toFixed(2)).join(' + ')}) / 20
                </div>
              </div>
            </div>

            <div className="border-t border-gray-600 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Trend:</span>
                <span className={`font-mono font-bold ${
                  calculation.smaTrend === 'increasing' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {calculation.smaTrend.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Change: ${(calculation.sma20Current - calculation.sma20Previous).toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  signDisplay: 'always' 
                })}
              </div>
            </div>
          </div>

          {/* EMA Calculation */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">21-Week Exponential Moving Average</h2>
            
            <div className="mb-4">
              <h3 className="font-semibold text-blue-400 mb-2">Previous EMA (weeks 1-21)</h3>
              <div className="text-sm text-gray-300 mb-2">
                EMA with α=0.0909: Start with week 1, then apply formula iteratively
              </div>
              <div className="font-mono text-lg mb-2">
                ${calculation.ema21Previous.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="bg-gray-700 p-2 rounded text-xs">
                <div className="text-gray-400 mb-1">📋 Copy to Google Calculator (EMA formula):</div>
                <div className="text-gray-300 mb-1">Start: Week 1 price, then: (week * 0.0909) + (prev_ema * 0.9091)</div>
                <div className="font-mono text-green-300 break-all select-all cursor-pointer"
                     onClick={() => {
                       const weeks = calculation.weeklyData.slice(0, 21);
                       let formula = `${weeks[0].closingPrice.toFixed(2)}`;
                       for (let i = 1; i < weeks.length; i++) {
                         formula = `(${weeks[i].closingPrice.toFixed(2)} * 0.0909) + ((${formula}) * 0.9091)`;
                       }
                       navigator.clipboard.writeText(formula);
                     }}>
                  Click to copy nested EMA formula
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold text-green-400 mb-2">Current EMA (weeks 2-22)</h3>
              <div className="text-sm text-gray-300 mb-2">
                EMA with α=0.0909: Start with week 2, then apply formula iteratively
              </div>
              <div className="font-mono text-lg mb-2">
                ${calculation.ema21Current.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="bg-gray-700 p-2 rounded text-xs">
                <div className="text-gray-400 mb-1">📋 Copy to Google Calculator (EMA formula):</div>
                <div className="text-gray-300 mb-1">Start: Week 2 price, then: (week * 0.0909) + (prev_ema * 0.9091)</div>
                <div className="font-mono text-green-300 break-all select-all cursor-pointer"
                     onClick={() => {
                       const weeks = calculation.weeklyData.slice(1, 22);
                       let formula = `${weeks[0].closingPrice.toFixed(2)}`;
                       for (let i = 1; i < weeks.length; i++) {
                         formula = `(${weeks[i].closingPrice.toFixed(2)} * 0.0909) + ((${formula}) * 0.9091)`;
                       }
                       navigator.clipboard.writeText(formula);
                     }}>
                  Click to copy nested EMA formula
                </div>
              </div>
            </div>

            <div className="border-t border-gray-600 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Trend:</span>
                <span className={`font-mono font-bold ${
                  calculation.emaTrend === 'increasing' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {calculation.emaTrend.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Change: ${(calculation.ema21Current - calculation.ema21Previous).toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  signDisplay: 'always' 
                })}
              </div>
            </div>
          </div>
        </div>

        {/* BMSB Analysis */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Bull Market Support Band Analysis</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-orange-400 mb-2">Support Band</h3>
              <div className="text-sm text-gray-300 mb-1">Lower: ${calculation.supportBandLower.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div className="text-sm text-gray-300 mb-1">Upper: ${calculation.supportBandUpper.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              <div className="text-xs text-gray-400">Lower = min(SMA, EMA)<br/>Upper = max(SMA, EMA)</div>
            </div>
            
            <div>
              <h3 className="font-semibold text-purple-400 mb-2">Price Position</h3>
              <div className={`font-mono font-bold text-lg ${
                calculation.pricePosition === 'above_band' ? 'text-green-400' :
                calculation.pricePosition === 'in_band' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {calculation.pricePosition.replace('_', ' ').toUpperCase()}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Current price vs support band
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-cyan-400 mb-2">Band Health</h3>
              <div className={`font-mono font-bold text-lg ${
                calculation.bandHealth === 'healthy' ? 'text-green-400' : 'text-red-400'
              }`}>
                {calculation.bandHealth.toUpperCase()}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {calculation.bandHealth === 'healthy' ? 
                  'Both SMA and EMA trending up' : 
                  'SMA and/or EMA trending down'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="text-center">
          <button 
            onClick={fetchBitcoinBMSB}
            className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold"
          >
            Refresh Calculation
          </button>
        </div>
      </div>
    </div>
  );
}