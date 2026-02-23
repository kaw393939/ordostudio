import { describe, expect, it } from "vitest";
import { registerMenu, resolveMenu, type MenuAudience } from "../navigation/menu-registry";

const labels = (audience: MenuAudience) => resolveMenu("publicPrimary", audience).map((item) => item.label);

describe("menu registry", () => {
  it("shows login to guests and hides account", () => {
    expect(labels("guest")).toEqual(["Home", "Training", "Studio", "Apprentices", "Insights", "About", "Book consult", "Login"]);
  });

  it("shows account to authenticated users and hides login", () => {
    expect(labels("user")).toEqual(["Home", "Training", "Studio", "Apprentices", "Insights", "About", "Book consult", "Account"]);
  });

  it("shows admin menu only to admin audience", () => {
    expect(resolveMenu("adminPrimary", "guest")).toEqual([]);
    expect(resolveMenu("adminPrimary", "user")).toEqual([]);
    expect(resolveMenu("adminPrimary", "admin").map((item) => item.label)).toEqual([
      "Admin Console",
      "Events",
      "Offers",
      "Intake",
      "Measurement",
      "Ledger",
      "Entitlements",
      "Apprentices",
      "Field reports",
      "Referrals",
      "Newsletter",
      "Commercial",
      "Users",
      "Audit",
    ]);
  });

  it("rejects invalid menu registration and duplicate hrefs", () => {
    expect(() =>
      registerMenu("publicPrimary", [
        { id: "bad", label: "Bad", href: "events", match: "exact" },
      ]),
    ).toThrow(/Invalid menu registration/);

    expect(() =>
      registerMenu("publicPrimary", [
        { id: "one", label: "One", href: "/events", match: "exact" },
        { id: "two", label: "Two", href: "/events", match: "prefix" },
      ]),
    ).toThrow(/duplicate href/);
  });
});
