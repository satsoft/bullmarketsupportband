import { CurrentPriceService } from './current-price-service';
import { supabaseAdmin } from './supabase';

export class SmartPriceUpdater {
  
  // Update only top 20 cryptocurrencies hourly, full list daily
  static async updatePricesSmartly(): Promise<void> {
    try {
      const hour = new Date().getHours();
      
      if (hour === 0) {
        // Full update once per day at midnight
        console.log('🌙 Running daily full price update...');
        await CurrentPriceService.updateCurrentPrices();
        console.log('✅ Daily full update completed');
      } else {
        // Hourly: Update only top 20 cryptocurrencies
        console.log('⏰ Running hourly top-20 price update...');
        await this.updateTop20Prices();
        console.log('✅ Hourly top-20 update completed');
      }
    } catch (error) {
      console.error('❌ Error in smart price update:', error);
      throw error;
    }
  }
  
  // Update only top 20 cryptocurrencies (uses ~1 API call)
  private static async updateTop20Prices(): Promise<void> {
    const { data: topCryptos } = await supabaseAdmin
      .from('cryptocurrencies')
      .select('id, coingecko_id, symbol')
      .eq('is_active', true)
      .order('current_rank', { ascending: true })
      .limit(20);

    if (!topCryptos) return;

    const coinIds = topCryptos.map(crypto => crypto.coingecko_id);
    const { coinGeckoAPI } = await import('./coingecko');
    const priceData = await coinGeckoAPI.getCurrentPrice(coinIds);

    const today = new Date().toISOString().split('T')[0];

    for (const crypto of topCryptos) {
      const priceInfo = priceData[crypto.coingecko_id];
      
      if (priceInfo?.usd) {
        await supabaseAdmin
          .from('daily_prices')
          .upsert({
            cryptocurrency_id: crypto.id,
            date: today,
            open_price: priceInfo.usd,
            high_price: priceInfo.usd,
            low_price: priceInfo.usd,
            close_price: priceInfo.usd,
            volume: 0,
            market_cap: 0
          }, {
            onConflict: 'cryptocurrency_id,date'
          });
      }
    }
  }
}