'use client';

import React, { useState, useEffect } from 'react';

export default function TestDashboard() {
  const [data, setData] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/bmsb-data?limit=5');
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        setData(result);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px', color: 'white', backgroundColor: 'black' }}>
        <h1>Test Dashboard - Loading...</h1>
        <div>Fetching BMSB data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red', backgroundColor: 'black' }}>
        <h1>Test Dashboard - Error</h1>
        <div>Error: {error}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', color: 'white', backgroundColor: 'black' }}>
      <h1>Test Dashboard - Success!</h1>
      <div>✅ Data loaded successfully</div>
      <div>📊 Count: {(data as { count?: number })?.count}</div>
      <div>🪙 Total cryptocurrencies: {(data as { metadata?: { total_cryptocurrencies?: number } })?.metadata?.total_cryptocurrencies}</div>
      
      <h2>Top 5 Cryptocurrencies:</h2>
      {(data as { data?: Array<{ id: string; rank: number; symbol: string; name: string; price: number; sma_20_week: number | null; ema_21_week: number | null; sma_trend: string | null; ema_trend: string | null; band_health: string; is_stablecoin: boolean; price_position?: string }> })?.data?.map((crypto) => (
        <div key={crypto.id} style={{ 
          margin: '10px 0', 
          padding: '10px', 
          border: '1px solid gray',
          backgroundColor: crypto.is_stablecoin ? '#333' : crypto.band_health === 'healthy' ? '#004400' : '#440000'
        }}>
          <div>#{crypto.rank} {crypto.symbol} - {crypto.name}</div>
          <div>Price: ${crypto.price?.toFixed(2)}</div>
          <div>Health: {crypto.band_health}</div>
          <div>Position: {crypto.price_position || 'N/A'}</div>
        </div>
      ))}
    </div>
  );
}