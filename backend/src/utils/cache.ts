/**
 * EverUndang In-Memory Caching System
 *
 * A lightweight, high-performance caching layer with:
 * - TTL (Time-to-Live) support
 * - LRU eviction policy
 * - Automatic cleanup
 * - Cache statistics
 * - Tag-based invalidation
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  tags: string[];
  accessCount: number;
  lastAccessedAt: number;
}

interface CacheOptions {
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Tags for group invalidation */
  tags?: string[];
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  memoryUsage: number;
  hitRate: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_SIZE = 1000; // Maximum entries
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute

class InMemoryCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private maxSize: number;
  private stats: { hits: number; misses: number };
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(maxSize: number = DEFAULT_MAX_SIZE) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.stats = { hits: 0, misses: 0 };
    this.startCleanupTimer();
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();

    this.stats.hits++;
    return entry.value as T;
  }

  /**
   * Set a value in cache
   */
  set<T>(key: string, value: T, options: CacheOptions = {}): void {
    const { ttl = DEFAULT_TTL, tags = [] } = options;

    // Evict LRU entries if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
      tags,
      accessCount: 0,
      lastAccessedAt: Date.now(),
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all entries with a specific tag
   */
  invalidateByTag(tag: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate all entries matching a key pattern
   */
  invalidateByPattern(pattern: string | RegExp): number {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const now = Date.now();
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    for (const entry of this.cache.values()) {
      if (oldestEntry === null || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
      if (newestEntry === null || entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt;
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.cache.size,
      memoryUsage: this.estimateMemoryUsage(),
      hitRate,
      oldestEntry,
      newestEntry,
    };
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, options);
    return value;
  }

  /**
   * Get multiple values at once
   */
  getMany<T>(keys: string[]): Map<string, T | null> {
    const result = new Map<string, T | null>();
    for (const key of keys) {
      result.set(key, this.get<T>(key));
    }
    return result;
  }

  /**
   * Set multiple values at once
   */
  setMany<T>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): void {
    for (const { key, value, options } of entries) {
      this.set(key, value, options);
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < lruTime) {
        lruTime = entry.lastAccessedAt;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL);

    // Don't prevent process from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop the cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Estimate memory usage (rough approximation)
   */
  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      // Rough estimate: key length + JSON stringified value
      size += key.length * 2; // UTF-16
      size += JSON.stringify(entry.value).length * 2;
      size += 100; // Overhead for entry metadata
    }
    return size;
  }
}

// Create cache instances for different purposes
export const invitationCache = new InMemoryCache(500);
export const rsvpCache = new InMemoryCache(2000);
export const analyticsCache = new InMemoryCache(200);
export const giftCache = new InMemoryCache(500);

// Cache key generators
export const CacheKeys = {
  invitation: (id: string) => `invitation:${id}`,
  invitationBySlug: (slug: string) => `invitation:slug:${slug}`,
  invitationList: (page: number, limit: number) => `invitations:list:${page}:${limit}`,
  rsvpList: (invitationId: string) => `rsvps:${invitationId}`,
  rsvpStats: (invitationId: string) => `rsvps:stats:${invitationId}`,
  guestbook: (invitationId: string) => `guestbook:${invitationId}`,
  analytics: (invitationId: string, type: string) => `analytics:${invitationId}:${type}`,
  giftPreferences: (invitationId: string) => `gifts:preferences:${invitationId}`,
  giftRegistry: (invitationId: string) => `gifts:registry:${invitationId}`,
  giftSuggestions: (invitationId: string) => `gifts:suggestions:${invitationId}`,
};

// Cache tags for group invalidation
export const CacheTags = {
  invitation: (id: string) => `tag:invitation:${id}`,
  invitations: "tag:invitations",
  rsvp: (invitationId: string) => `tag:rsvp:${invitationId}`,
  guestbook: (invitationId: string) => `tag:guestbook:${invitationId}`,
  analytics: (invitationId: string) => `tag:analytics:${invitationId}`,
  gifts: (invitationId: string) => `tag:gifts:${invitationId}`,
};

// TTL configurations for different data types
export const CacheTTL = {
  /** Short-lived cache for frequently changing data (1 minute) */
  SHORT: 60 * 1000,
  /** Medium cache for moderately changing data (5 minutes) */
  MEDIUM: 5 * 60 * 1000,
  /** Long cache for stable data (30 minutes) */
  LONG: 30 * 60 * 1000,
  /** Extended cache for rarely changing data (1 hour) */
  EXTENDED: 60 * 60 * 1000,
  /** Very long cache for almost static data (24 hours) */
  DAY: 24 * 60 * 60 * 1000,
};

/**
 * Invalidate all caches related to an invitation
 */
export function invalidateInvitationCaches(invitationId: string, slug?: string): void {
  const tag = CacheTags.invitation(invitationId);

  // Invalidate invitation cache
  invitationCache.delete(CacheKeys.invitation(invitationId));
  if (slug) {
    invitationCache.delete(CacheKeys.invitationBySlug(slug));
  }
  invitationCache.invalidateByPattern(/^invitations:list:/);
  invitationCache.invalidateByTag(tag);

  // Invalidate related caches
  rsvpCache.invalidateByTag(tag);
  analyticsCache.invalidateByTag(tag);
  giftCache.invalidateByTag(tag);
}

/**
 * Get combined cache statistics
 */
export function getAllCacheStats(): Record<string, CacheStats> {
  return {
    invitation: invitationCache.getStats(),
    rsvp: rsvpCache.getStats(),
    analytics: analyticsCache.getStats(),
    gift: giftCache.getStats(),
  };
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  invitationCache.clear();
  rsvpCache.clear();
  analyticsCache.clear();
  giftCache.clear();
}

export { InMemoryCache };
export type { CacheEntry, CacheOptions, CacheStats };
