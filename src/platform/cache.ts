/**
 * Cache Port — abstraction for server-side query result caching.
 *
 * Single-process, in-memory implementation suitable for SQLite
 * single-instance deployments. TTL-based expiry + LRU eviction.
 */

export interface CachePort {
  /** Retrieve a cached value. Returns `undefined` if missing or expired. */
  get<T>(key: string): T | undefined;

  /** Store a value with a TTL in milliseconds. */
  set<T>(key: string, value: T, ttlMs: number): void;

  /** Invalidate a specific cache key. */
  invalidate(key: string): void;

  /**
   * Invalidate all keys matching a glob-like pattern.
   * Supports trailing `*` only (e.g. `events:*`).
   */
  invalidatePattern(pattern: string): void;

  /** Remove all cache entries. */
  clear(): void;

  /** Current number of entries (for testing/metrics). */
  readonly size: number;
}

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  lastAccessedAt: number;
}

/**
 * In-memory cache with TTL expiry and LRU eviction.
 *
 * Resolves config from environment:
 * - CACHE_MAX_ENTRIES (default 1000)
 * - CACHE_ENABLED (default "true")
 */
export class InMemoryCache implements CachePort {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly enabled: boolean;

  constructor(opts?: { maxEntries?: number; enabled?: boolean }) {
    this.maxEntries = opts?.maxEntries ?? parseInt(process.env.CACHE_MAX_ENTRIES ?? "1000", 10);
    this.enabled = opts?.enabled ?? (process.env.CACHE_ENABLED ?? "true") !== "false";
  }

  get size(): number {
    return this.entries.size;
  }

  get<T>(key: string): T | undefined {
    if (!this.enabled) return undefined;

    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }

    // Update LRU timestamp
    entry.lastAccessedAt = Date.now();
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    if (!this.enabled) return;

    // Evict if at capacity
    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
      this.evictLru();
    }

    this.entries.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      lastAccessedAt: Date.now(),
    });
  }

  invalidate(key: string): void {
    this.entries.delete(key);
  }

  invalidatePattern(pattern: string): void {
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      for (const key of this.entries.keys()) {
        if (key.startsWith(prefix)) {
          this.entries.delete(key);
        }
      }
    } else {
      // Exact match fallback
      this.entries.delete(pattern);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  /** Evict the least-recently-accessed entry. */
  private evictLru(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.entries) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.entries.delete(oldestKey);
    }
  }
}
