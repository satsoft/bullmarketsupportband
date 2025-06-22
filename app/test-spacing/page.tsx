'use client';

import React from 'react';

export default function TestSpacing() {
  const testRanks = [
    { rank: 1, symbol: "BTC", name: "Bitcoin" },
    { rank: 10, symbol: "STETH", name: "Staked Ether" },
    { rank: 99, symbol: "OSETH", name: "StakeWise Staked ETH" },
    { rank: 100, symbol: "METH", name: "Mantle Staked Ether" }
  ];

  return (
    <div style={{ padding: '20px', backgroundColor: 'black', color: 'white', minHeight: '100vh' }}>
      <h1>Spacing Test - Rank Display Optimization</h1>
      <p>Testing alignment with different rank numbers:</p>
      
      <div style={{ 
        marginTop: '20px', 
        border: '1px solid #444', 
        backgroundColor: '#111',
        width: '400px'
      }}>
        {testRanks.map((item) => (
          <div key={item.rank} className="flex items-center bg-gray-900 border-b border-gray-800 hover:bg-gray-850 transition-colors duration-200">
            {/* Ticker Content */}
            <div className="flex-1 px-3 py-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 text-xs font-mono w-8 text-right">
                    #{item.rank}
                  </span>
                  <div className="leading-tight">
                    <div className="text-white font-mono text-xs font-semibold">
                      {item.symbol}
                    </div>
                    <div className="text-gray-500 text-xs truncate max-w-32 leading-none">
                      {item.name}
                    </div>
                  </div>
                </div>
                
                <div className="text-right leading-tight">
                  <div className="text-white font-mono text-xs">
                    $42,000
                  </div>
                  <div className="text-xs font-mono leading-none text-gray-400">
                    ABOVE
                  </div>
                </div>
              </div>
            </div>
            
            {/* Status Box */}
            <div className="w-6 h-6 flex-shrink-0 mr-2 bg-green-500 shadow-md">
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#ccc' }}>
        <h3>Improvements Made:</h3>
        <ul>
          <li>✅ <strong>Rank width increased:</strong> w-6 → w-8 (24px → 32px)</li>
          <li>✅ <strong>Right-aligned ranks:</strong> Consistent alignment for 1-3 digits</li>
          <li>✅ <strong>Better spacing:</strong> space-x-1.5 → space-x-2</li>
          <li>✅ <strong>More padding:</strong> px-2 → px-3 for breathing room</li>
          <li>✅ <strong>Status box margin:</strong> mr-1.5 → mr-2</li>
        </ul>
        
        <h3>Visual Result:</h3>
        <ul>
          <li><strong>#1</strong> and <strong>#100</strong> now have consistent spacing</li>
          <li>Right-aligned ranks create clean visual column</li>
          <li>Better separation between rank and ticker symbol</li>
          <li>More breathing room throughout the layout</li>
        </ul>
      </div>
    </div>
  );
}