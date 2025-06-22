import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Ticker } from '@/app/types';
import exchangeChecker from '@/lib/exchange-checker';
import { getAllExcludedTokens, shouldExcludeToken } from '@/lib/token-filters';
import { checkRateLimit } from '@/lib/auth';

export interface BMSBApiResponse {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  current_price: number;
  sma_20_week: number | null;
  ema_21_week: number | null;
  support_band_lower: number | null;
  support_band_upper: number | null;
  price_position: 'above_band' | 'in_band' | 'below_band' | null;
  sma_trend: 'increasing' | 'decreasing' | 'flat' | null;
  ema_trend: 'increasing' | 'decreasing' | 'flat' | null;
  band_health: 'healthy' | 'mixed' | 'weak' | 'stablecoin';
  is_stablecoin: boolean;
  calculation_date: string | null;
}

export async function GET(request: NextRequest) {
  // Apply rate limiting for public API
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const rateLimit = checkRateLimit(clientIP, { requests: 60, window: 60000 }); // 60 requests per minute
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded', resetTime: rateLimit.resetTime },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': rateLimit.resetTime.toString() } }
    );
  }
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    
    console.log(`Fetching BMSB data for top ${limit} cryptocurrencies (excluding derivative tokens)...`);

    // Get all excluded tokens from comprehensive filter system
    const excludedTokenSymbols = getAllExcludedTokens();
    
    // Define tokens that should be included despite being marked as stablecoins in the database
    const forceIncludeTokens: string[] = []; // Currently none - all tokens must have sufficient BMSB data
    
    console.log(`Excluding ${excludedTokenSymbols.length} derivative tokens`);
    console.log(`Force include tokens: ${forceIncludeTokens.join(', ')}`);

    // We'll determine the exact cutoff after we know our #100 token's rank

    // Get cryptocurrencies with their latest BMSB calculations and daily prices
    // Fetch ALL tokens without pre-filtering to ensure we can get exactly 100 after filtering
    const { data: cryptoData, error } = await supabaseAdmin
      .from('cryptocurrencies')
      .select(`
        id,
        symbol,
        name,
        current_rank,
        is_stablecoin
      `)
      .eq('is_active', true)
      .order('current_rank', { ascending: true })
      .limit(175); // Fetch top 175 to ensure we have enough to get 100 eligible

    if (error) {
      throw error;
    }

    if (!cryptoData || cryptoData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No cryptocurrency data found'
      }, { status: 404 });
    }

    // We'll track excluded tokens after determining the final cutoff rank
    
    // Apply filtering to eligible crypto data (these should all pass)
    const eligibleCryptos = cryptoData.filter(crypto => {
      // Apply force include first
      if (forceIncludeTokens.includes(crypto.symbol)) {
        return true;
      }
      
      // Apply exclusion filters with full token list for dynamic decisions
      const exclusion = shouldExcludeToken({
        symbol: crypto.symbol,
        name: crypto.name,
        is_stablecoin: crypto.is_stablecoin,
        current_rank: crypto.current_rank
      }, cryptoData.map(c => ({ symbol: c.symbol, current_rank: c.current_rank })));
      
      return !exclusion.exclude;
    });

    console.log(`Filtered from ${cryptoData.length} to ${eligibleCryptos.length} eligible tokens`);

    // Get all BMSB calculations and daily prices in batch queries for better performance
    const cryptoIds = eligibleCryptos.map(c => c.id);
    
    
    // Get latest BMSB calculations for all cryptocurrencies
    const { data: bmsbCalculations } = await supabaseAdmin
      .from('bmsb_calculations')
      .select('*')
      .in('cryptocurrency_id', cryptoIds)
      .order('calculation_date', { ascending: false });

    // Get latest daily prices for all cryptocurrencies
    const { data: dailyPrices } = await supabaseAdmin
      .from('daily_prices')
      .select('cryptocurrency_id, close_price, date')
      .in('cryptocurrency_id', cryptoIds)
      .order('date', { ascending: false });

    // Get exchange mappings for all cryptocurrencies
    const { data: exchangeMappings } = await supabaseAdmin
      .from('exchange_mappings')
      .select('cryptocurrency_id, exchange_name, trading_pair, is_preferred')
      .in('cryptocurrency_id', cryptoIds)
      .eq('is_available', true)
      .order('cryptocurrency_id', { ascending: true })
      .order('is_preferred', { ascending: false });

    // Create lookup maps for better performance
    const bmsbMap = new Map();
    bmsbCalculations?.forEach(calc => {
      if (!bmsbMap.has(calc.cryptocurrency_id)) {
        bmsbMap.set(calc.cryptocurrency_id, calc);
      }
    });

    const priceMap = new Map();
    dailyPrices?.forEach(price => {
      if (!priceMap.has(price.cryptocurrency_id)) {
        priceMap.set(price.cryptocurrency_id, price);
      }
    });

    const exchangeMap = new Map();
    exchangeMappings?.forEach(mapping => {
      if (!exchangeMap.has(mapping.cryptocurrency_id)) {
        exchangeMap.set(mapping.cryptocurrency_id, mapping);
      }
    });
    

    // Transform data for frontend and filter for complete BMSB data
    const transformedTickers = eligibleCryptos.map(crypto => {
      const bmsbCalc = bmsbMap.get(crypto.id);
      const dailyPrice = priceMap.get(crypto.id);
      const exchangeMapping = exchangeMap.get(crypto.id);
      
      // Determine current price from daily prices (most recent) or BMSB calculation
      let currentPrice = 0;
      if (dailyPrice?.close_price) {
        currentPrice = dailyPrice.close_price;
      } else if (bmsbCalc?.current_price) {
        currentPrice = bmsbCalc.current_price;
      }

      // Generate TradingView symbol from exchange mapping
      let tradingViewSymbol: string | undefined;
      if (exchangeMapping) {
        tradingViewSymbol = exchangeChecker.getTradingViewSymbol(
          exchangeMapping.exchange_name,
          exchangeMapping.trading_pair
        );
      }

      return {
        id: crypto.id,
        symbol: crypto.symbol,
        name: crypto.name,
        price: currentPrice,
        change: 0, // Will be calculated from price movements over time
        changePercent: 0, // Will be calculated from price movements over time
        status: (bmsbCalc?.band_health === 'healthy' ? 'up' : 'down') as 'up' | 'down',
        lastUpdate: new Date(),
        rank: crypto.current_rank || 0,
        sma_20_week: bmsbCalc?.sma_20_week || null,
        ema_21_week: bmsbCalc?.ema_21_week || null,
        support_band_lower: bmsbCalc?.support_band_lower || null,
        support_band_upper: bmsbCalc?.support_band_upper || null,
        price_position: bmsbCalc?.price_position || null,
        sma_trend: bmsbCalc?.sma_trend || null,
        ema_trend: bmsbCalc?.ema_trend || null,
        band_health: bmsbCalc?.band_health || 'weak',
        is_stablecoin: false, // Override - treat all returned tokens as non-stablecoins for dashboard
        calculation_date: bmsbCalc?.calculation_date || null,
        tradingview_symbol: tradingViewSymbol
      };
    });

    // Filter for complete BMSB data (insufficient data tracking happens later)
    const bmsbData: Ticker[] = transformedTickers.filter(ticker => 
      ticker.sma_20_week !== null && ticker.ema_21_week !== null
    );

    console.log(`After BMSB filtering: ${bmsbData.length} tokens with complete data out of ${transformedTickers.length} transformed`);
    
    // Ensure we get exactly the requested number (100) by taking exactly that many
    // If we have more eligible tokens than needed, take the top ones by market cap rank
    const sortedBmsbData = bmsbData.sort((a, b) => {
      const aOriginal = eligibleCryptos.find(c => c.symbol === a.symbol);
      const bOriginal = eligibleCryptos.find(c => c.symbol === b.symbol);
      return (aOriginal?.current_rank || 9999) - (bOriginal?.current_rank || 9999);
    });
    
    console.log(`Available tokens with BMSB data: ${sortedBmsbData.length}, requesting: ${limit}`);
    
    const finalBmsbData = sortedBmsbData
      .slice(0, Math.min(sortedBmsbData.length, limit)) // Take up to the requested number or all available
      .map((ticker, index) => ({
        ...ticker,
        rank: index + 1 // Renumber from 1-100 for display
      }));
      
    console.log(`Final result: ${finalBmsbData.length} tokens`);

    // Renumbered for consecutive display ranking

    console.log(`Successfully fetched BMSB data for ${finalBmsbData.length} cryptocurrencies with complete 20W data`);
    
    // If we don't have enough tokens, log which ones are missing BMSB data
    if (finalBmsbData.length < limit) {
      const missingDataTokens = eligibleCryptos
        .filter(crypto => {
          const bmsbCalc = bmsbMap.get(crypto.id);
          return !bmsbCalc?.sma_20_week || !bmsbCalc?.ema_21_week;
        })
        .slice(0, limit - finalBmsbData.length + 10) // Show next 10+ tokens that need BMSB data
        .map(crypto => `${crypto.symbol} (#${crypto.current_rank})`);
      
      console.log(`⚠️  Only ${finalBmsbData.length}/${limit} tokens with complete BMSB data. Next tokens needing calculations:`, missingDataTokens.join(', '));
    }

    // Now determine the exact cutoff rank and track excluded tokens
    const excludedTokens: Array<{symbol: string; category: string}> = [];
    
    if (finalBmsbData.length > 0) {
      // Get the rank of our #100 token (or last token if less than 100)
      const lastTokenRank = finalBmsbData[finalBmsbData.length - 1].rank;
      const lastTokenOriginalRank = eligibleCryptos.find(c => c.symbol === finalBmsbData[finalBmsbData.length - 1].symbol)?.current_rank;
      const cutoffRank = lastTokenOriginalRank || lastTokenRank;
      
      console.log(`Our #${finalBmsbData.length} token has original rank #${cutoffRank}. Checking exclusions from ranks 1-${cutoffRank}`);
      
      // Get all tokens from rank 1 to our cutoff rank
      const { data: allTokensInRange } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('id, symbol, name, current_rank, is_stablecoin')
        .eq('is_active', true)
        .lte('current_rank', cutoffRank)
        .order('current_rank', { ascending: true });

      if (allTokensInRange) {
        // Find which tokens in this range were excluded
        const finalTokenSymbols = new Set(finalBmsbData.map(t => t.symbol));
        
        allTokensInRange.forEach(token => {
          // Skip if this token made it to our final list
          if (finalTokenSymbols.has(token.symbol)) {
            return;
          }
          
          // Skip force include tokens
          if (forceIncludeTokens.includes(token.symbol)) {
            return;
          }
          
          // Determine why this token was excluded
          const exclusion = shouldExcludeToken({
            symbol: token.symbol,
            name: token.name,
            is_stablecoin: token.is_stablecoin
          });
          
          if (exclusion.exclude) {
            excludedTokens.push({
              symbol: token.symbol,
              category: exclusion.reason || 'unknown'
            });
          } else {
            // Check if excluded due to insufficient BMSB data
            const bmsbCalc = bmsbMap.get(token.id);
            if (!bmsbCalc?.sma_20_week || !bmsbCalc?.ema_21_week) {
              excludedTokens.push({
                symbol: token.symbol,
                category: 'insufficient_data'
              });
            }
          }
        });
        
        console.log(`Found ${excludedTokens.length} tokens excluded from ranks 1-${cutoffRank}:`, excludedTokens.slice(0, 10).map(t => t.symbol).join(', '));
      }
    }

    // Get the most recent price update timestamp
    let lastPriceUpdate = null;
    if (dailyPrices && dailyPrices.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const todayPrices = dailyPrices.filter(p => p.date === today);
      
      // If we have prices from today, show as recent (since GitHub Actions run every 10 min)
      if (todayPrices.length > 0) {
        // Use current time minus 2 minutes to indicate very recent update
        const recentTime = new Date();
        recentTime.setMinutes(recentTime.getMinutes() - 2);
        lastPriceUpdate = recentTime.toISOString();
      } else {
        // No prices from today, find the most recent date
        const mostRecentPrice = dailyPrices.reduce((latest, current) => 
          new Date(current.date) > new Date(latest.date) ? current : latest
        );
        lastPriceUpdate = mostRecentPrice.date;
      }
    }

    return NextResponse.json({
      success: true,
      data: finalBmsbData,
      count: finalBmsbData.length,
      metadata: {
        total_cryptocurrencies: finalBmsbData.length,
        complete_bmsb_data: finalBmsbData.length, // All returned tokens now have complete data
        excluded_token_types: ['stablecoins', 'wrapped_tokens', 'liquid_staking_tokens', 'liquid_restaking_tokens', 'cross_chain_tokens', 'synthetic_tokens', 'insufficient_data'],
        excluded_tokens: excludedTokens,
        last_updated: lastPriceUpdate || new Date().toISOString()
      }
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching BMSB data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch BMSB data' 
      },
      { status: 500 }
    );
  }
}