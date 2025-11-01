/**
 * Simple caching implementation for traceability data
 * Educational approach with 2-minute TTL for performance balance
 */

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

export class SimpleTraceabilityCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 2 * 60 * 1000; // 2 minutes

  /**
   * Retrieves cached data if still valid
   * @param key Cache key
   * @returns Cached data or null if expired/missing
   */
  get(key: string): unknown | null {
    const entry = this.cache.get(key);

    if (entry && Date.now() - entry.timestamp < this.TTL) {
      return entry.data;
    }

    // Clean up expired entry
    if (entry) {
      this.cache.delete(key);
    }

    return null;
  }

  /**
   * Stores data in cache with current timestamp
   * @param key Cache key
   * @param data Data to cache
   */
  set(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clears all cached entries
   * Called when modal is closed
   */
  clear(): void {
    this.cache.clear();
  }

  // Static helper methods for consistent cache key generation

  /**
   * Generates cache key for token data
   * @param tokenId Token ID
   * @returns Cache key string
   */
  static tokenKey(tokenId: number): string {
    return `token_${tokenId}`;
  }

  /**
   * Generates cache key for user data
   * @param address User address
   * @returns Cache key string
   */
  static userKey(address: string): string {
    return `user_${address}`;
  }

  /**
   * Generates cache key for token lineage
   * @param tokenId Token ID
   * @returns Cache key string
   */
  static lineageKey(tokenId: number): string {
    return `lineage_${tokenId}`;
  }

  /**
   * Generates cache key for transfer history
   * @param tokenId Token ID
   * @returns Cache key string
   */
  static transferHistoryKey(tokenId: number): string {
    return `transfers_${tokenId}`;
  }

  /**
   * Generates cache key for token timeline
   * @param tokenId Token ID
   * @returns Cache key string
   */
  static timelineKey(tokenId: number): string {
    return `timeline_${tokenId}`;
  }
}
