import React from 'react';
import { Ticker } from '../types';
import { TickerItem } from './TickerItem';

interface TickerListProps {
  tickers: Ticker[];
}

export const TickerList: React.FC<TickerListProps> = ({ tickers }) => {
  // Responsive column configuration: [columns, itemsPerColumn]
  const getColumnConfig = () => {
    // We'll use CSS classes to determine which config to use
    // xl: 5x20, lg: 4x25, md: 3x34, sm: 2x50, xs: 1x100
    return [
      { breakpoint: 'xl', columns: 5, itemsPerColumn: 20 },
      { breakpoint: 'lg', columns: 4, itemsPerColumn: 25 },
      { breakpoint: 'md', columns: 3, itemsPerColumn: 34 },
      { breakpoint: 'sm', columns: 2, itemsPerColumn: 50 },
      { breakpoint: 'xs', columns: 1, itemsPerColumn: 100 }
    ];
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const configs = getColumnConfig();

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full">
        {/* XL: 5 columns x 20 items */}
        <div className="h-full hidden xl:grid grid-cols-5">
          {Array.from({ length: 5 }, (_, columnIndex) => {
            const itemsPerColumn = 20;
            const start = columnIndex * itemsPerColumn;
            const end = start + itemsPerColumn;
            const columnTickers = tickers.slice(start, end);
            
            return (
              <div key={columnIndex} className="overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700 border-r border-gray-800 last:border-r-0 bg-gray-900">
                <div>
                  {columnTickers.map((ticker, index) => (
                    <TickerItem 
                      key={ticker.id} 
                      ticker={ticker} 
                      index={start + index} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* LG: 4 columns x 25 items */}
        <div className="h-full hidden lg:grid xl:hidden grid-cols-4">
          {Array.from({ length: 4 }, (_, columnIndex) => {
            const itemsPerColumn = 25;
            const start = columnIndex * itemsPerColumn;
            const end = start + itemsPerColumn;
            const columnTickers = tickers.slice(start, end);
            
            return (
              <div key={columnIndex} className="overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700 border-r border-gray-800 last:border-r-0 bg-gray-900">
                <div>
                  {columnTickers.map((ticker, index) => (
                    <TickerItem 
                      key={ticker.id} 
                      ticker={ticker} 
                      index={start + index} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* MD: 3 columns x 34 items (approximately) */}
        <div className="h-full hidden md:grid lg:hidden grid-cols-3">
          {Array.from({ length: 3 }, (_, columnIndex) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const itemsPerColumn = Math.ceil(100 / 3); // 34, 33, 33
            const start = columnIndex * 33 + (columnIndex > 0 ? 1 : 0); // Adjust for uneven distribution
            const end = columnIndex === 0 ? 34 : start + 33;
            const columnTickers = tickers.slice(start, end);
            
            return (
              <div key={columnIndex} className="overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700 border-r border-gray-800 last:border-r-0 bg-gray-900">
                <div>
                  {columnTickers.map((ticker, index) => (
                    <TickerItem 
                      key={ticker.id} 
                      ticker={ticker} 
                      index={start + index} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* SM: 2 columns x 50 items */}
        <div className="h-full hidden sm:grid md:hidden grid-cols-2">
          {Array.from({ length: 2 }, (_, columnIndex) => {
            const itemsPerColumn = 50;
            const start = columnIndex * itemsPerColumn;
            const end = start + itemsPerColumn;
            const columnTickers = tickers.slice(start, end);
            
            return (
              <div key={columnIndex} className="overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700 border-r border-gray-800 last:border-r-0 bg-gray-900">
                <div>
                  {columnTickers.map((ticker, index) => (
                    <TickerItem 
                      key={ticker.id} 
                      ticker={ticker} 
                      index={start + index} 
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* XS: 1 column x 100 items */}
        <div className="h-full grid sm:hidden grid-cols-1">
          <div className="overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700 bg-gray-900">
            <div className="divide-y divide-gray-800">
              {tickers.map((ticker, index) => (
                <TickerItem 
                  key={ticker.id} 
                  ticker={ticker} 
                  index={index} 
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};