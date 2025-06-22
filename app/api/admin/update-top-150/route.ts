import { NextRequest, NextResponse } from 'next/server';
import { CurrentPriceService } from '@/lib/current-price-service';
import { validateCronAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Validate cron authentication
    if (!validateCronAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚀 Starting top 150 cryptocurrencies update...');
    const startTime = Date.now();

    await CurrentPriceService.updateTop150Cryptocurrencies();

    const duration = Date.now() - startTime;
    console.log(`✅ Top 150 update completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Top 150 cryptocurrencies updated successfully',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error updating top 150 cryptocurrencies:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}