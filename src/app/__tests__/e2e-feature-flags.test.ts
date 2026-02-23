// @vitest-environment node

/**
 * E2E: Feature Flags — PRD-13
 *
 * Tests the /api/v1/feature-flags endpoint which returns
 * build-time and runtime feature flag values.
 */

import { describe, it, expect, afterEach } from "vitest";
import { GET } from "../api/v1/feature-flags/route";

describe("e2e: feature-flags", () => {
  const savedJson = process.env.APP_RUNTIME_FEATURE_FLAGS_JSON;

  afterEach(() => {
    if (savedJson !== undefined) {
      process.env.APP_RUNTIME_FEATURE_FLAGS_JSON = savedJson;
    } else {
      delete process.env.APP_RUNTIME_FEATURE_FLAGS_JSON;
    }
  });

  it("GET /api/v1/feature-flags returns 200 with flags", async () => {
    const response = await GET(new Request("http://localhost:3000/api/v1/feature-flags"));
    expect(response.status).toBe(200);

    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("flags");
    expect(typeof body.flags).toBe("object");
  });

  it("flags object contains boolean values", async () => {
    const response = await GET(new Request("http://localhost:3000/api/v1/feature-flags"));
    const body = (await response.json()) as { flags: Record<string, unknown> };

    for (const [, value] of Object.entries(body.flags)) {
      expect(typeof value).toBe("boolean");
    }
  });

  it("response has cache-control: no-store", async () => {
    const response = await GET(new Request("http://localhost:3000/api/v1/feature-flags"));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("includes HAL _links", async () => {
    const response = await GET(new Request("http://localhost:3000/api/v1/feature-flags"));
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toHaveProperty("_links");
  });

  it("runtime overrides are applied from APP_RUNTIME_FEATURE_FLAGS_JSON", async () => {
    process.env.APP_RUNTIME_FEATURE_FLAGS_JSON = JSON.stringify({
      CALENDAR_GRID: true,
    });

    const response = await GET(new Request("http://localhost:3000/api/v1/feature-flags"));
    const body = (await response.json()) as { flags: Record<string, boolean>; runtime_loaded: boolean };

    expect(body.runtime_loaded).toBe(true);
    expect(body.flags.CALENDAR_GRID).toBe(true);
  });

  it("returns runtime_loaded: false when no overrides configured", async () => {
    delete process.env.APP_RUNTIME_FEATURE_FLAGS_JSON;
    delete process.env.APP_RUNTIME_FEATURE_FLAGS_FILE;

    const response = await GET(new Request("http://localhost:3000/api/v1/feature-flags"));
    const body = (await response.json()) as { runtime_loaded: boolean };

    expect(body.runtime_loaded).toBe(false);
  });
});
