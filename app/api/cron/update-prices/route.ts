import { NextRequest, NextResponse } from 'next/server';
import { validateCronAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Validate cron authentication
    if (!validateCronAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting hourly price update...');
    const startTime = Date.now();

    // Smart update: Top 20 hourly, full update daily
    const { SmartPriceUpdater } = await import('@/lib/smart-price-updater');
    await SmartPriceUpdater.updatePricesSmartly();

    const duration = Date.now() - startTime;
    console.log(`✅ Hourly price update completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Current prices updated successfully',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in hourly price update:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also allow POST requests for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}