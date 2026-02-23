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
});
