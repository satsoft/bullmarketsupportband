/**
 * Simple in-memory cache for API responses
 * Production note: Consider Redis for distributed caching
 */

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class APICache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 1000; // Maximum cache entries
  
  /**
   * Get cached data if it exists and is not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  /**
   * Set cached data with TTL
   */
  set(key: string, data: unknown, ttlMinutes: number = 5): void {
    // Clear old entries if cache is getting too large
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000 // Convert to milliseconds
    });
  }
  
  /**
   * Delete specific cache entry
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Remove expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }
    
    // Delete expired entries
    toDelete.forEach(key => this.cache.delete(key));
    
    // If still too large, delete oldest entries
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const deleteCount = Math.floor(this.maxSize * 0.2); // Delete 20% of entries
      for (let i = 0; i < deleteCount && i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }
  
  /**
   * Create a cache key from URL and parameters
   */
  static createKey(endpoint: string, params: Record<string, unknown> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `${endpoint}?${sortedParams}`;
  }
}

// Export singleton instance
export const apiCache = new APICache();

/**
 * Cached API wrapper for common patterns
 */
export class CachedAPI {
  /**
   * Get or fetch data with caching
   */
  static async getOrFetch<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttlMinutes: number = 5
  ): Promise<T> {
    // Try to get from cache first
    const cached = apiCache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Fetch fresh data
    const data = await fetchFn();
    
    // Cache the result
    apiCache.set(cacheKey, data, ttlMinutes);
    
    return data;
  }
}