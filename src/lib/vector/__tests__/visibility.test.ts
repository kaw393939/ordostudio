import { describe, it, expect } from "vitest";
import { isVisibleTo, visibilityFilter, LEVEL } from "../visibility";
import type { Visibility } from "../visibility";

// ---------------------------------------------------------------------------
// LEVEL mapping
// ---------------------------------------------------------------------------

describe("LEVEL", () => {
  it("PUBLIC has the lowest level (0)", () => {
    expect(LEVEL.PUBLIC).toBe(0);
  });

  it("AUTHENTICATED is above PUBLIC", () => {
    expect(LEVEL.AUTHENTICATED).toBeGreaterThan(LEVEL.PUBLIC);
  });

  it("ADMIN is above AUTHENTICATED", () => {
    expect(LEVEL.ADMIN).toBeGreaterThan(LEVEL.AUTHENTICATED);
  });
});

// ---------------------------------------------------------------------------
// isVisibleTo
// ---------------------------------------------------------------------------

describe("isVisibleTo", () => {
  it("PUBLIC content is visible to anonymous (null) users", () => {
    expect(isVisibleTo("PUBLIC", null)).toBe(true);
  });

  it("PUBLIC content is visible to all authenticated users", () => {
    expect(isVisibleTo("PUBLIC", "AUTHENTICATED")).toBe(true);
    expect(isVisibleTo("PUBLIC", "ADMIN")).toBe(true);
  });

  it("AUTHENTICATED content is NOT visible to anonymous users", () => {
    expect(isVisibleTo("AUTHENTICATED", null)).toBe(false);
  });

  it("AUTHENTICATED content is visible to AUTHENTICATED users", () => {
    expect(isVisibleTo("AUTHENTICATED", "AUTHENTICATED")).toBe(true);
  });

  it("AUTHENTICATED content is visible to ADMIN users", () => {
    expect(isVisibleTo("AUTHENTICATED", "ADMIN")).toBe(true);
  });

  it("ADMIN content is NOT visible to anonymous users", () => {
    expect(isVisibleTo("ADMIN", null)).toBe(false);
  });

  it("ADMIN content is NOT visible to AUTHENTICATED users", () => {
    expect(isVisibleTo("ADMIN", "AUTHENTICATED")).toBe(false);
  });

  it("ADMIN content is visible to ADMIN users", () => {
    expect(isVisibleTo("ADMIN", "ADMIN")).toBe(true);
  });

  it("unknown role string maps to level 0 (PUBLIC only)", () => {
    expect(isVisibleTo("PUBLIC", "UNKNOWN_ROLE")).toBe(true);
    expect(isVisibleTo("AUTHENTICATED", "UNKNOWN_ROLE")).toBe(false);
    expect(isVisibleTo("ADMIN", "UNKNOWN_ROLE")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// visibilityFilter
// ---------------------------------------------------------------------------

describe("visibilityFilter", () => {
  it("anonymous (null) user sees only PUBLIC", () => {
    const filter = visibilityFilter(null);
    expect(filter).toContain("PUBLIC");
    expect(filter).not.toContain("AUTHENTICATED");
    expect(filter).not.toContain("ADMIN");
  });

  it("AUTHENTICATED user sees PUBLIC and AUTHENTICATED", () => {
    const filter = visibilityFilter("AUTHENTICATED");
    expect(filter).toContain("PUBLIC");
    expect(filter).toContain("AUTHENTICATED");
    expect(filter).not.toContain("ADMIN");
  });

  it("ADMIN user sees all tiers", () => {
    const filter = visibilityFilter("ADMIN");
    const tiers: Visibility[] = ["PUBLIC", "AUTHENTICATED", "ADMIN"];
    for (const t of tiers) {
      expect(filter).toContain(t);
    }
  });

  it("unknown role returns same as anonymous", () => {
    const filter = visibilityFilter("NOT_A_ROLE");
    expect(filter).toEqual(visibilityFilter(null));
  });

  it("filter length corresponds to the number of accessible tiers", () => {
    expect(visibilityFilter(null)).toHaveLength(1);
    expect(visibilityFilter("AUTHENTICATED")).toHaveLength(2);
    expect(visibilityFilter("ADMIN")).toHaveLength(3);
  });
});
