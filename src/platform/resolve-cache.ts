/**
 * Cache resolver — singleton access to the application-level CachePort.
 *
 * Supports test-time override via setCache() / resetCache().
 */
import { type CachePort, InMemoryCache } from "./cache";

let _override: CachePort | null = null;
let _default: CachePort | null = null;

export const resolveCache = (): CachePort => {
  if (_override) return _override;
  if (!_default) {
    _default = new InMemoryCache();
  }
  return _default;
};

/** Override the global cache instance (test seam). */
export const setCache = (cache: CachePort): void => {
  _override = cache;
};

/** Reset the cache to default (test cleanup). */
export const resetCache = (): void => {
  _override = null;
  _default = null;
};
