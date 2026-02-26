import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";

import { GET as getSiteSettings, PATCH as patchSiteSettings } from "../api/v1/site-settings/route";
import { GET as getContentSearch } from "../api/v1/content/search/route";
import { searchContent } from "../../lib/api/content-search";

import {
  cleanupStandardE2EFixtures,
  setupStandardE2EFixture,
  type StandardE2EFixture,
} from "./helpers/e2e-fixtures";

let fixture: StandardE2EFixture;

describe("e2e content config (Sprint 35)", () => {
  beforeEach(async () => {
    fixture = await setupStandardE2EFixture();
    process.env.APPCTL_ENV = "local";
  });

  afterEach(async () => {
    await cleanupStandardE2EFixtures();
  });

  it("Test 1: site_settings migration creates table with seed data", () => {
    const db = new Database(fixture.dbPath);
    try {
      const rows = db
        .prepare("SELECT key, value FROM site_settings ORDER BY key ASC")
        .all() as { key: string; value: string }[];
      expect(rows.length).toBe(7);
      const keys = rows.map((r) => r.key);
      expect(keys).toContain("contact.phone");
      expect(keys).toContain("contact.email");
      expect(keys).toContain("contact.booking_url");
      expect(keys).toContain("brand.name");
      expect(keys).toContain("brand.tagline");
      expect(keys).toContain("commission.rate_pct");
      expect(keys).toContain("guild.affiliate_min_payout_usd");
    } finally {
      db.close();
    }
  });

  it("Test 2: GET /api/v1/site-settings returns 401 without session", async () => {
    const res = await getSiteSettings(
      new Request("http://localhost/api/v1/site-settings")
    );
    expect(res.status).toBe(401);
  });

  it("Test 3: GET /api/v1/site-settings returns all settings for admin session", async () => {
    const res = await getSiteSettings(
      new Request("http://localhost/api/v1/site-settings", {
        headers: { cookie: fixture.adminCookie },
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.settings).toBeDefined();
    expect(body.settings["contact.phone"]).toBeDefined();
    expect(body.settings["commission.rate_pct"]).toBe("20");
    expect(Object.keys(body.settings).length).toBe(7);
  });

  it("Test 4: PATCH /api/v1/site-settings updates a value and reflects in next GET", async () => {
    const patchRes = await patchSiteSettings(
      new Request("http://localhost/api/v1/site-settings", {
        method: "PATCH",
        headers: {
          cookie: fixture.adminCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({ "contact.phone": "+1 (555) 999-0000" }),
      })
    );
    expect(patchRes.status).toBe(200);
    const patchBody = await patchRes.json();
    expect(patchBody.settings["contact.phone"]).toBe("+1 (555) 999-0000");

    // Verify persisted via a fresh GET
    const getRes = await getSiteSettings(
      new Request("http://localhost/api/v1/site-settings", {
        headers: { cookie: fixture.adminCookie },
      })
    );
    const getBody = await getRes.json();
    expect(getBody.settings["contact.phone"]).toBe("+1 (555) 999-0000");
  });

  it("Test 5: PATCH /api/v1/site-settings returns 422 for an unknown key", async () => {
    const res = await patchSiteSettings(
      new Request("http://localhost/api/v1/site-settings", {
        method: "PATCH",
        headers: {
          cookie: fixture.adminCookie,
          "content-type": "application/json",
        },
        body: JSON.stringify({ "unknown.mystery.key": "value" }),
      })
    );
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.detail).toMatch(/unknown.mystery.key/i);
  });

  it("Test 6: searchContent('commission') returns a relevant excerpt", async () => {
    const results = await searchContent("commission");
    expect(results.length).toBeGreaterThan(0);
    const topResult = results[0];
    expect(topResult.file).toBeDefined();
    expect(topResult.excerpt).toBeDefined();
    expect(topResult.score).toBeGreaterThan(0);
    // The commission policy file should score highly
    const mentions = results.some((r) => r.file.includes("commission"));
    expect(mentions).toBe(true);
  });

  it("Test 7: searchContent with unmatchable query returns empty array (not an error)", async () => {
    const results = await searchContent("xyzzy_unmatchable_gibberish_qqqqqq");
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(0);
  });
});
