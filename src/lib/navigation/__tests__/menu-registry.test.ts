import { describe, it, expect } from "vitest";
import { resolveMenuForContext } from "../menu-registry";

describe("Menu Registry RBAC", () => {
  it("should return admin items for SUPER_ADMIN", () => {
    const items = resolveMenuForContext("adminHeaderQuick", {
      audience: "admin",
      roles: ["SUPER_ADMIN"],
    });
    expect(items.some((i) => i.id === "admin-home")).toBe(true);
    expect(items.some((i) => i.id === "admin-deals")).toBe(true);
    expect(items.some((i) => i.id === "admin-intake")).toBe(true);
  });

  it("should return limited admin items for MAESTRO", () => {
    const items = resolveMenuForContext("adminHeaderQuick", {
      audience: "admin",
      roles: ["MAESTRO"],
    });
    expect(items.some((i) => i.id === "admin-home")).toBe(true);
    expect(items.some((i) => i.id === "admin-deals")).toBe(true);
    expect(items.some((i) => i.id === "admin-intake")).toBe(false); // MAESTRO shouldn't see intake
  });

  it("should return empty for guest in admin menu", () => {
    const items = resolveMenuForContext("adminHeaderQuick", {
      audience: "guest",
      roles: [],
    });
    expect(items.length).toBe(0);
  });

  it("should return empty for regular user in admin menu", () => {
    const items = resolveMenuForContext("adminHeaderQuick", {
      audience: "user",
      roles: ["USER"],
    });
    expect(items.length).toBe(0);
  });

  it("should return public items for guest", () => {
    const items = resolveMenuForContext("publicHeader", {
      audience: "guest",
      roles: [],
    });
    expect(items.some((i) => i.id === "studio")).toBe(true);
    expect(items.some((i) => i.id === "events")).toBe(true);
  });

  it("should include Phase 5 routes for SUPER_ADMIN", () => {
    const items = resolveMenuForContext("adminPrimary", {
      audience: "admin",
      roles: ["SUPER_ADMIN"],
    });
    expect(items.some((i) => i.id === "admin-telemetry")).toBe(true);
    expect(items.some((i) => i.id === "admin-agent-ops")).toBe(true);
  });

  it("should hide Phase 5 routes from non-SUPER_ADMIN roles", () => {
    const adminItems = resolveMenuForContext("adminPrimary", {
      audience: "admin",
      roles: ["ADMIN"],
    });
    expect(adminItems.some((i) => i.id === "admin-telemetry")).toBe(false);
    expect(adminItems.some((i) => i.id === "admin-agent-ops")).toBe(false);

    const maestroItems = resolveMenuForContext("adminPrimary", {
      audience: "admin",
      roles: ["MAESTRO"],
    });
    expect(maestroItems.some((i) => i.id === "admin-telemetry")).toBe(false);
    expect(maestroItems.some((i) => i.id === "admin-agent-ops")).toBe(false);
  });

  it("should include billing and logout in user account menu", () => {
    const items = resolveMenuForContext("userAccount", {
      audience: "user",
      roles: [],
    });
    expect(items.some((i) => i.id === "billing")).toBe(true);
    expect(items.some((i) => i.href === "/settings/billing")).toBe(true);
    expect(items.some((i) => i.id === "logout")).toBe(true);
    expect(items.some((i) => i.href === "/logout")).toBe(true);
  });

  it("should not include Dashboard or Logout in publicHeader for authenticated users", () => {
    const items = resolveMenuForContext("publicHeader", {
      audience: "user",
      roles: [],
    });
    expect(items.some((i) => i.id === "dashboard")).toBe(false);
    expect(items.some((i) => i.id === "account")).toBe(false);
    expect(items.some((i) => i.id === "logout")).toBe(false);
  });
});
