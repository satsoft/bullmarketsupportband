import { NextRequest, NextResponse } from 'next/server';
import { CryptocurrencyService } from '@/lib/crypto-service';
import { checkRateLimit } from '@/lib/auth';

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
    
    const cryptocurrencies = await CryptocurrencyService.getTopCryptocurrencies(limit);
    
    return NextResponse.json({
      success: true,
      data: cryptocurrencies,
      count: cryptocurrencies.length
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimit.remaining.toString(),
        'X-RateLimit-Reset': rateLimit.resetTime.toString()
      }
    });
    
  } catch (error) {
    console.error('Error fetching cryptocurrencies:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch cryptocurrencies' 
      },
      { status: 500 }
    );
  }
}