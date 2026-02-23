// @vitest-environment node
/**
 * Performance benchmarks + ISR/caching verification (PRD-11)
 *
 * - Verifies API response times are within acceptable bounds
 * - Checks ISR revalidation configuration on public pages
 * - Validates database indexes exist after migration
 * - Tests cache integration with API read paths
 */
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";
import { InMemoryCache } from "../../platform/cache";
import { setCache, resetCache } from "../../platform/resolve-cache";

let fixture: StandardE2EFixture;

describe("performance and caching (PRD-11)", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
  });

  afterEach(async () => {
    resetCache();
    await cleanupStandardE2EFixtures();
  });

  // ──── Database indexes ────────────────────────────────────

  describe("database performance indexes", () => {
    it("creates idx_events_status_start composite index", () => {
      const db = new Database(fixture.dbPath);
      try {
        const indexes = db
          .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='events'")
          .all() as { name: string }[];
        const names = indexes.map((i) => i.name);
        expect(names).toContain("idx_events_status_start");
      } finally {
        db.close();
      }
    });

    it("creates idx_registrations_event_status composite index", () => {
      const db = new Database(fixture.dbPath);
      try {
        const indexes = db
          .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='event_registrations'")
          .all() as { name: string }[];
        const names = indexes.map((i) => i.name);
        expect(names).toContain("idx_registrations_event_status");
      } finally {
        db.close();
      }
    });

    it("creates idx_offers_status index", () => {
      const db = new Database(fixture.dbPath);
      try {
        const indexes = db
          .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='offers'")
          .all() as { name: string }[];
        const names = indexes.map((i) => i.name);
        expect(names).toContain("idx_offers_status");
      } finally {
        db.close();
      }
    });

    it("creates idx_audit_log_action_time index", () => {
      const db = new Database(fixture.dbPath);
      try {
        const indexes = db
          .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='audit_log'")
          .all() as { name: string }[];
        const names = indexes.map((i) => i.name);
        expect(names).toContain("idx_audit_log_action_time");
        expect(names).toContain("idx_audit_log_actor");
      } finally {
        db.close();
      }
    });
  });

  // ──── InMemoryCache unit behaviour ────────────────────────

  describe("InMemoryCache behaviour", () => {
    it("caches and retrieves event list results", () => {
      const cache = new InMemoryCache();
      const events = [{ id: "1", title: "Workshop" }, { id: "2", title: "Bootcamp" }];
      cache.set("events:list:PUBLISHED::20:0", events, 30_000);

      const cached = cache.get<typeof events>("events:list:PUBLISHED::20:0");
      expect(cached).toEqual(events);
    });

    it("invalidates event cache on mutation pattern", () => {
      const cache = new InMemoryCache();
      cache.set("events:list:PUBLISHED::20:0", [1, 2, 3], 30_000);
      cache.set("events:detail:my-event", { id: "1" }, 60_000);
      cache.set("offers:list:all", [4, 5], 300_000);

      cache.invalidatePattern("events:*");

      expect(cache.get("events:list:PUBLISHED::20:0")).toBeUndefined();
      expect(cache.get("events:detail:my-event")).toBeUndefined();
      expect(cache.get("offers:list:all")).toEqual([4, 5]); // untouched
    });
  });

  // ──── API response time benchmarks ────────────────────────

  describe("API response time benchmarks", () => {
    it("GET /api/v1/events responds under 200ms", async () => {
      const { GET } = await import("../api/v1/events/route");
      const req = new Request("http://localhost:3000/api/v1/events", {
        headers: { origin: "http://localhost:3000", cookie: fixture.adminCookie },
      });

      const start = performance.now();
      const res = await GET(req);
      const duration = performance.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(200);
    });

    it("GET /api/v1/events/:slug responds under 200ms", async () => {
      const { GET } = await import("../api/v1/events/[slug]/route");
      const req = new Request("http://localhost:3000/api/v1/events/published-open", {
        headers: { origin: "http://localhost:3000", cookie: fixture.adminCookie },
      });

      const start = performance.now();
      const res = await GET(req, { params: Promise.resolve({ slug: "published-open" }) });
      const duration = performance.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(200);
    });

    it("POST /api/v1/auth/login responds under 500ms (argon2)", async () => {
      const { POST } = await import("../api/v1/auth/login/route");
      const req = new Request("http://localhost:3000/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          email: "usera@example.com",
          password: "Password123!",
        }),
      });

      const start = performance.now();
      const res = await POST(req);
      const duration = performance.now() - start;

      expect(res.status).toBe(200);
      expect(duration).toBeLessThan(500);
    });
  });

  // ──── ISR revalidation verification ───────────────────────

  describe("ISR revalidation configuration", () => {
    it("public events page source has cache-control header setup", async () => {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const src = await readFile(join(process.cwd(), "src/app/api/v1/events/route.ts"), "utf8");

      // Verify read endpoints set cache-control
      expect(src).toContain("cache-control");
      expect(src).toContain("max-age=30");
      expect(src).toContain("stale-while-revalidate");
    });

    it("event detail API has cache headers", async () => {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const src = await readFile(join(process.cwd(), "src/app/api/v1/events/[slug]/route.ts"), "utf8");

      expect(src).toContain("cache-control");
    });
  });

  // ──── Cache resolver integration ──────────────────────────

  describe("cache resolver integration", () => {
    it("setCache and resolveCache work together", async () => {
      const cache = new InMemoryCache({ maxEntries: 50 });
      setCache(cache);

      const { resolveCache } = await import("../../platform/resolve-cache");
      expect(resolveCache()).toBe(cache);
    });
  });
});
