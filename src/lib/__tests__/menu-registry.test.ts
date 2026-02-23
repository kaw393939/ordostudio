import { describe, expect, it } from "vitest";
import { registerMenu, resolveMenu, resolveMenuForContext, type MenuAudience } from "../navigation/menu-registry";

const labels = (audience: MenuAudience) => resolveMenu("publicHeader", audience).map((item) => item.label);

describe("menu registry", () => {
  it("shows login to guests and hides account", () => {
    expect(labels("guest")).toEqual(["Training", "Events", "Studio", "Book consult", "Login"]);
  });

  it("shows account to authenticated users and hides login", () => {
    expect(labels("user")).toEqual(["Training", "Events", "Studio", "Book consult", "Dashboard"]);
  });

  it("shows role-gated items only when role is present", () => {
    const base = { audience: "user" as const, roles: [] as string[] };

    const withoutRole = resolveMenuForContext("publicHeader", base);
    expect(withoutRole.some((item) => item.id === "studio-report")).toBe(false);

    const withRole = resolveMenuForContext("publicHeader", { ...base, roles: ["APPRENTICE"] });
    expect(withRole.some((item) => item.id === "studio-report")).toBe(true);
  });

  it("shows admin menu only to admin audience", () => {
    expect(resolveMenu("adminPrimary", "guest")).toEqual([]);
    expect(resolveMenu("adminPrimary", "user")).toEqual([]);
    // Admin menu items are role-gated; without roles, items are hidden.
    expect(resolveMenu("adminPrimary", "admin")).toEqual([]);

    expect(resolveMenuForContext("adminPrimary", { audience: "admin", roles: ["ADMIN"] }).map((item) => item.label)).toEqual([
      "Admin Console",
      "Deals",
      "Events",
      "Registrations",
      "Engagements",
      "Offers",
      "Intake",
      "Commercial",
      "Ledger",
      "Apprentices",
      "Field reports",
      "Referrals",
      "Newsletter",
      "Users",
      "Audit",
    ]);

    expect(resolveMenuForContext("adminPrimary", { audience: "admin", roles: ["MAESTRO"] }).map((item) => item.label)).toEqual([
      "Admin Console",
      "Deals",
      "Events",
      "Newsletter",
    ]);

    expect(resolveMenuForContext("adminPrimary", { audience: "admin", roles: ["SUPER_ADMIN"] }).map((item) => item.label)).toEqual([
      "Admin Console",
      "Deals",
      "Events",
      "Registrations",
      "Engagements",
      "Offers",
      "Intake",
      "Commercial",
      "Ledger",
      "Measurement",
      "Flywheel",
      "Entitlements",
      "Apprentices",
      "Field reports",
      "Referrals",
      "Newsletter",
      "Users",
      "Settings",
      "Audit",
    ]);
  });

  it("rejects invalid menu registration and duplicate hrefs", () => {
    expect(() =>
      registerMenu("publicHeader", [
        { id: "bad", label: "Bad", href: "events", match: "exact" },
      ]),
    ).toThrow(/Invalid menu registration/);

    expect(() =>
      registerMenu("publicHeader", [
        { id: "one", label: "One", href: "/events", match: "exact" },
        { id: "two", label: "Two", href: "/events", match: "prefix" },
      ]),
    ).toThrow(/duplicate href/);
  });
});
