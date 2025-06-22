import { NextRequest } from 'next/server';

/**
 * Validates admin API key for protected endpoints
 */
export function validateAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    console.error('ADMIN_API_KEY not configured');
    return false;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const providedKey = authHeader.substring(7); // Remove 'Bearer ' prefix
  return providedKey === expectedKey;
}

/**
 * Validates cron job authentication
 */
export function validateCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedKey = process.env.CRON_SECRET_KEY;

  if (!expectedKey) {
    console.error('CRON_SECRET_KEY not configured');
    return false;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const providedKey = authHeader.substring(7);
  return providedKey === expectedKey;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  requests: number;
  window: number; // in milliseconds
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple in-memory rate limiting
 */
export function checkRateLimit(
  identifier: string, 
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  
  // Clean old entries
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  
  const current = rateLimitStore.get(identifier);
  
  if (!current || current.resetTime < now) {
    // New window
    const resetTime = now + config.window;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: config.requests - 1,
      resetTime
    };
  }
  
  if (current.count >= config.requests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: current.resetTime
    };
  }
  
  current.count++;
  return {
    allowed: true,
    remaining: config.requests - current.count,
    resetTime: current.resetTime
  };
}