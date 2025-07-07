import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add compression headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Accept-Encoding', 'gzip, deflate, br');
    
    // Add cache headers for static API responses
    if (request.nextUrl.pathname.includes('bmsb-data') || 
        request.nextUrl.pathname.includes('summary')) {
      response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    }
  }

  return response;
}

export const config = {
  matcher: '/api/:path*'
};