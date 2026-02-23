import { describe, expect, it } from "vitest";
import {
  eventListKey,
  eventDetailKey,
  offerListKey,
  offerDetailKey,
  apprenticeListKey,
  apprenticeDetailKey,
  serviceListKey,
  INVALIDATION_MAP,
  CACHE_TTLS,
} from "../cache-keys";
import { InMemoryCache } from "../cache";

describe("cache keys", () => {
  it("eventListKey generates unique keys per query params", () => {
    const k1 = eventListKey({ status: "PUBLISHED" });
    const k2 = eventListKey({ status: "DRAFT" });
    const k3 = eventListKey({ status: "PUBLISHED", q: "react" });

    expect(k1).not.toBe(k2);
    expect(k1).not.toBe(k3);
    expect(k1).toContain("events:list:");
    expect(k1).toContain("PUBLISHED");
  });

  it("eventListKey uses defaults for missing params", () => {
    const k = eventListKey({});
    expect(k).toContain("all");
    expect(k).toContain("20"); // default limit
    expect(k).toContain("0"); // default offset
  });

  it("eventDetailKey includes slug", () => {
    expect(eventDetailKey("my-event")).toBe("events:detail:my-event");
  });

  it("offerListKey includes status", () => {
    expect(offerListKey({ status: "ACTIVE" })).toContain("ACTIVE");
    expect(offerListKey()).toContain("all");
  });

  it("offerDetailKey includes slug", () => {
    expect(offerDetailKey("cool-offer")).toBe("offers:detail:cool-offer");
  });

  it("apprenticeListKey is stable", () => {
    expect(apprenticeListKey()).toBe("apprentices:list");
  });

  it("apprenticeDetailKey includes handle", () => {
    expect(apprenticeDetailKey("jane")).toBe("apprentices:detail:jane");
  });

  it("serviceListKey is stable", () => {
    expect(serviceListKey()).toBe("services:list");
  });
});

describe("CACHE_TTLS", () => {
  it("defines reasonable TTLs", () => {
    expect(CACHE_TTLS.EVENTS_LIST).toBe(30_000);
    expect(CACHE_TTLS.EVENTS_DETAIL).toBe(60_000);
    expect(CACHE_TTLS.OFFERS_LIST).toBe(300_000);
    expect(CACHE_TTLS.SERVICES).toBe(600_000);
  });
});

describe("INVALIDATION_MAP", () => {
  it("event mutations invalidate events:* pattern", () => {
    expect(INVALIDATION_MAP["event:create"]).toEqual(["events:*"]);
    expect(INVALIDATION_MAP["event:update"]).toEqual(["events:*"]);
    expect(INVALIDATION_MAP["event:publish"]).toEqual(["events:*"]);
  });

  it("offer mutations invalidate offers:* pattern", () => {
    expect(INVALIDATION_MAP["offer:create"]).toEqual(["offers:*"]);
    expect(INVALIDATION_MAP["offer:update"]).toEqual(["offers:*"]);
  });

  it("integration: invalidation patterns actually clear cache", () => {
    const cache = new InMemoryCache();
    cache.set("events:list:all:20:0", [1, 2, 3], 60000);
    cache.set("events:detail:slug", { id: 1 }, 60000);
    cache.set("offers:list:all", [4, 5], 60000);

    // Simulate event:create invalidation
    for (const pattern of INVALIDATION_MAP["event:create"]) {
      cache.invalidatePattern(pattern);
    }

    expect(cache.get("events:list:all:20:0")).toBeUndefined();
    expect(cache.get("events:detail:slug")).toBeUndefined();
    expect(cache.get("offers:list:all")).toEqual([4, 5]); // not affected
  });
});
