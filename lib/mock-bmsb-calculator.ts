import { supabaseAdmin } from './supabase';
import { BMSBResult } from './bmsb-calculator';

// Mock BMSB calculator for demonstration when historical data is limited
export class MockBMSBCalculator {
  
  // Generate realistic BMSB data based on current price and crypto characteristics
  static generateMockBMSB(
    symbol: string, 
    currentPrice: number, 
    marketCapRank: number,
    isStablecoin: boolean
  ): BMSBResult {
    
    if (isStablecoin) {
      return {
        sma_20_week: currentPrice,
        ema_21_week: currentPrice,
        sma_20_week_previous: currentPrice,
        ema_21_week_previous: currentPrice,
        support_band_lower: currentPrice * 0.999,
        support_band_upper: currentPrice * 1.001,
        current_price: currentPrice,
        price_position: 'in_band' as const,
        sma_trend: 'decreasing' as const,
        ema_trend: 'decreasing' as const,
        band_health: 'stablecoin' as const,
        is_applicable: false
      };
    }

    // Generate mock trends based on market cap rank and some randomness
    const trendSeed = symbol.charCodeAt(0) + symbol.charCodeAt(1); // Deterministic randomness
    const isTopTier = marketCapRank <= 10;
    const isMidTier = marketCapRank <= 50;
    
    // Top tier cryptos are more likely to be in healthy state
    let healthProbability: number;
    if (isTopTier) {
      healthProbability = 0.7; // 70% chance of healthy
    } else if (isMidTier) {
      healthProbability = 0.5; // 50% chance of healthy
    } else {
      healthProbability = 0.3; // 30% chance of healthy
    }
    
    const random = (trendSeed % 100) / 100;
    
    // Generate SMA and EMA around current price
    const volatility = isTopTier ? 0.15 : isMidTier ? 0.25 : 0.35;
    const smaOffset = (((trendSeed * 7) % 100) / 100 - 0.5) * volatility;
    const emaOffset = (((trendSeed * 11) % 100) / 100 - 0.5) * volatility;
    
    const sma20Week = currentPrice * (1 + smaOffset);
    const ema21Week = currentPrice * (1 + emaOffset);
    
    // Generate previous values for trend calculation
    const smaPreviousOffset = smaOffset + (random - 0.5) * 0.1;
    const emaPreviousOffset = emaOffset + (random - 0.5) * 0.1;
    
    const sma20WeekPrevious = currentPrice * (1 + smaPreviousOffset);
    const ema21WeekPrevious = currentPrice * (1 + emaPreviousOffset);
    
    // Determine trends
    const smaTrend = sma20Week > sma20WeekPrevious ? 'increasing' : 'decreasing';
    const emaTrend = ema21Week > ema21WeekPrevious ? 'increasing' : 'decreasing';
    
    // Determine band health
    let bandHealth: 'healthy' | 'weak';
    if (smaTrend === 'increasing' && emaTrend === 'increasing') {
      bandHealth = 'healthy';
    } else {
      bandHealth = 'weak';
    }
    
    // Occasionally override based on market position to add realism
    if (random < healthProbability && bandHealth !== 'healthy') {
      bandHealth = 'healthy';
    }
    
    // Determine price position
    const lowerBound = Math.min(sma20Week, ema21Week);
    const upperBound = Math.max(sma20Week, ema21Week);
    
    let pricePosition: 'above_band' | 'in_band' | 'below_band';
    if (currentPrice > upperBound) {
      pricePosition = 'above_band';
    } else if (currentPrice < lowerBound) {
      pricePosition = 'below_band';
    } else {
      pricePosition = 'in_band';
    }
    
    return {
      sma_20_week: sma20Week,
      ema_21_week: ema21Week,
      sma_20_week_previous: sma20WeekPrevious,
      ema_21_week_previous: ema21WeekPrevious,
      support_band_lower: lowerBound,
      support_band_upper: upperBound,
      current_price: currentPrice,
      price_position: pricePosition,
      sma_trend: smaTrend,
      ema_trend: emaTrend,
      band_health: bandHealth,
      is_applicable: true
    };
  }

  // Calculate mock BMSB for all stored cryptocurrencies
  static async calculateAllMockBMSB(): Promise<void> {
    try {
      console.log('🚀 Generating mock BMSB calculations...');
      
      // Get all cryptocurrencies with current market data
      const { data: cryptos, error } = await supabaseAdmin
        .from('cryptocurrencies')
        .select('*')
        .eq('is_active', true)
        .order('current_rank', { ascending: true });

      if (error) {
        throw error;
      }

      console.log(`Processing ${cryptos?.length || 0} cryptocurrencies...`);

      let successCount = 0;
      
      for (const crypto of cryptos || []) {
        try {
          // Get latest market data to determine current price
          // For now, generate a realistic price based on rank
          let currentPrice: number;
          
          if (crypto.symbol === 'BTC') {
            currentPrice = 105000 + (Math.random() - 0.5) * 10000;
          } else if (crypto.symbol === 'ETH') {
            currentPrice = 3500 + (Math.random() - 0.5) * 500;
          } else if (crypto.is_stablecoin) {
            currentPrice = 1.0 + (Math.random() - 0.5) * 0.02; // Small variation around $1
          } else if (crypto.current_rank <= 10) {
            currentPrice = 100 + Math.random() * 1000;
          } else if (crypto.current_rank <= 50) {
            currentPrice = 1 + Math.random() * 100;
          } else {
            currentPrice = 0.01 + Math.random() * 10;
          }
          
          const bmsbResult = this.generateMockBMSB(
            crypto.symbol,
            currentPrice,
            crypto.current_rank,
            crypto.is_stablecoin
          );
          
          // Get current health to store as previous_health
          const { data: currentRecord } = await supabaseAdmin
            .from('bmsb_calculations')
            .select('band_health')
            .eq('cryptocurrency_id', crypto.id)
            .eq('calculation_date', new Date().toISOString().split('T')[0])
            .single();

          // Store in database with previous_health preserved
          const { error: insertError } = await supabaseAdmin
            .from('bmsb_calculations')
            .upsert({
              cryptocurrency_id: crypto.id,
              calculation_date: new Date().toISOString().split('T')[0],
              previous_health: currentRecord?.band_health || bmsbResult.band_health, // Preserve current as previous
              ...bmsbResult
            }, {
              onConflict: 'cryptocurrency_id,calculation_date'
            });

          if (insertError) {
            console.error(`Error storing BMSB for ${crypto.symbol}:`, insertError);
          } else {
            successCount++;
            
            const healthColor = bmsbResult.band_health === 'healthy' ? '🟢' : 
                               bmsbResult.band_health === 'stablecoin' ? '⚪' : '🔴';
            
            console.log(`✅ ${crypto.symbol}: ${healthColor} ${bmsbResult.band_health} - $${currentPrice.toFixed(2)}`);
          }
          
        } catch (error) {
          console.error(`Error processing ${crypto.symbol}:`, error);
        }
      }

      console.log(`\n✅ Mock BMSB calculation completed!`);
      console.log(`   Processed: ${successCount}/${cryptos?.length || 0} cryptocurrencies`);
      
    } catch (error) {
      console.error('❌ Error in calculateAllMockBMSB:', error);
      throw error;
    }
  }
}