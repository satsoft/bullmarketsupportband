/**
 * Simple in-memory cache with TTL support for reducing database queries
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new MemoryCache();

// Clean up cache every 5 minutes
setInterval(() => cache.cleanup(), 5 * 60 * 1000);

// Cache duration constants
export const CACHE_DURATION = {
  BMSB_DATA: 5 * 60 * 1000,    // 5 minutes for BMSB data
  SUMMARY: 2 * 60 * 1000,      // 2 minutes for summary
  RANKINGS: 10 * 60 * 1000,    // 10 minutes for rankings
  HEALTH_CHANGES: 1 * 60 * 1000 // 1 minute for health changes
} as const;