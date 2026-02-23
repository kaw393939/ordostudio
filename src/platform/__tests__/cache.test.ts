import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { InMemoryCache } from "../cache";

describe("InMemoryCache", () => {
  let cache: InMemoryCache;

  beforeEach(() => {
    cache = new InMemoryCache({ maxEntries: 5 });
  });

  // ──── Basic get/set ────────────────────────────────────────

  it("returns undefined for a key that was never set", () => {
    expect(cache.get("missing")).toBeUndefined();
  });

  it("stores and retrieves a value", () => {
    cache.set("key1", { name: "Alice" }, 5000);
    expect(cache.get("key1")).toEqual({ name: "Alice" });
  });

  it("stores primitive values", () => {
    cache.set("count", 42, 5000);
    expect(cache.get<number>("count")).toBe(42);
  });

  it("stores array values", () => {
    cache.set("items", [1, 2, 3], 5000);
    expect(cache.get<number[]>("items")).toEqual([1, 2, 3]);
  });

  it("overwrites an existing key", () => {
    cache.set("key1", "old", 5000);
    cache.set("key1", "new", 5000);
    expect(cache.get("key1")).toBe("new");
  });

  // ──── TTL expiry ───────────────────────────────────────────

  it("returns undefined for an expired entry", () => {
    vi.useFakeTimers();
    try {
      cache.set("short", "data", 100);
      expect(cache.get("short")).toBe("data");

      vi.advanceTimersByTime(101);
      expect(cache.get("short")).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns the value just before TTL expires", () => {
    vi.useFakeTimers();
    try {
      cache.set("edge", "data", 1000);
      vi.advanceTimersByTime(999);
      expect(cache.get("edge")).toBe("data");
    } finally {
      vi.useRealTimers();
    }
  });

  it("expired entries are removed from the map", () => {
    vi.useFakeTimers();
    try {
      cache.set("temp", "gone", 50);
      expect(cache.size).toBe(1);

      vi.advanceTimersByTime(51);
      cache.get("temp"); // triggers cleanup
      expect(cache.size).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  // ──── Invalidation ─────────────────────────────────────────

  it("invalidate() removes a specific key", () => {
    cache.set("a", 1, 5000);
    cache.set("b", 2, 5000);
    cache.invalidate("a");
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
  });

  it("invalidatePattern() removes keys with matching prefix", () => {
    cache.set("events:list:1", "page1", 5000);
    cache.set("events:list:2", "page2", 5000);
    cache.set("events:detail:slug", "detail", 5000);
    cache.set("offers:list", "offers", 5000);

    cache.invalidatePattern("events:*");
    expect(cache.get("events:list:1")).toBeUndefined();
    expect(cache.get("events:list:2")).toBeUndefined();
    expect(cache.get("events:detail:slug")).toBeUndefined();
    expect(cache.get("offers:list")).toBe("offers");
  });

  it("invalidatePattern() with exact match (no wildcard)", () => {
    cache.set("key", "value", 5000);
    cache.invalidatePattern("key");
    expect(cache.get("key")).toBeUndefined();
  });

  it("clear() removes all entries", () => {
    cache.set("a", 1, 5000);
    cache.set("b", 2, 5000);
    cache.set("c", 3, 5000);
    expect(cache.size).toBe(3);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("a")).toBeUndefined();
  });

  // ──── LRU eviction ─────────────────────────────────────────

  it("evicts least-recently-accessed entry when at capacity", () => {
    vi.useFakeTimers();
    try {
      // Fill cache to maxEntries (5)
      cache.set("e1", 1, 60000);
      vi.advanceTimersByTime(10);
      cache.set("e2", 2, 60000);
      vi.advanceTimersByTime(10);
      cache.set("e3", 3, 60000);
      vi.advanceTimersByTime(10);
      cache.set("e4", 4, 60000);
      vi.advanceTimersByTime(10);
      cache.set("e5", 5, 60000);
      vi.advanceTimersByTime(10);

      // Access e1 to make it "recently used"
      cache.get("e1");
      vi.advanceTimersByTime(10);

      // Add e6 → should evict e2 (oldest lastAccessedAt that wasn't re-accessed)
      cache.set("e6", 6, 60000);
      expect(cache.size).toBe(5);
      expect(cache.get("e2")).toBeUndefined(); // evicted
      expect(cache.get("e1")).toBe(1); // still here (was accessed)
      expect(cache.get("e6")).toBe(6); // newly added
    } finally {
      vi.useRealTimers();
    }
  });

  // ──── Size property ────────────────────────────────────────

  it("reports correct size", () => {
    expect(cache.size).toBe(0);
    cache.set("a", 1, 5000);
    expect(cache.size).toBe(1);
    cache.set("b", 2, 5000);
    expect(cache.size).toBe(2);
    cache.invalidate("a");
    expect(cache.size).toBe(1);
  });

  // ──── Disabled cache ───────────────────────────────────────

  it("disabled cache returns undefined and does not store", () => {
    const disabled = new InMemoryCache({ enabled: false });
    disabled.set("key", "val", 5000);
    expect(disabled.get("key")).toBeUndefined();
    expect(disabled.size).toBe(0);
  });

  // ──── Cache resolver ───────────────────────────────────────

  describe("cache resolver", () => {
    afterEach(async () => {
      const { resetCache } = await import("../resolve-cache");
      resetCache();
    });

    it("resolveCache returns same instance on repeated calls", async () => {
      const { resolveCache } = await import("../resolve-cache");
      const c1 = resolveCache();
      const c2 = resolveCache();
      expect(c1).toBe(c2);
    });

    it("setCache overrides the global cache", async () => {
      const { resolveCache, setCache } = await import("../resolve-cache");
      const custom = new InMemoryCache({ maxEntries: 10 });
      setCache(custom);
      expect(resolveCache()).toBe(custom);
    });

    it("resetCache clears the override", async () => {
      const { resolveCache, setCache, resetCache } = await import("../resolve-cache");
      const custom = new InMemoryCache({ maxEntries: 10 });
      setCache(custom);
      resetCache();
      expect(resolveCache()).not.toBe(custom);
    });
  });
});
