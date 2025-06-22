import { NextRequest, NextResponse } from 'next/server';
import { CurrentPriceService } from '@/lib/current-price-service';
import { validateAdminAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Validate admin authentication
  if (!validateAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    console.log('🔄 Admin price update triggered...');
    const startTime = Date.now();

    await CurrentPriceService.updateCurrentPrices();

    const duration = Date.now() - startTime;
    console.log(`✅ Admin price update completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'Admin price update completed successfully',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in manual price update:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}