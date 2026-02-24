import { describe, expect, it } from "vitest";

import { canAccessAdminFromMe, hasRequiredRole, roleAccessProblem } from "../ui-access";

describe("ui access", () => {
  it("allows admin when /me exposes admin affordance", () => {
    const allowed = canAccessAdminFromMe({
      _links: {
        self: { href: "/api/v1/me" },
        admin: { href: "/api/v1/admin" },
      },
    });

    expect(allowed).toBe(true);
  });

  it("denies admin when /me lacks users affordance", () => {
    const allowed = canAccessAdminFromMe({
      _links: {
        self: { href: "/api/v1/me" },
      },
    });

    expect(allowed).toBe(false);
  });

  describe("hasRequiredRole", () => {
    it("returns true when user has one of the required roles", () => {
      expect(hasRequiredRole(["SUPER_ADMIN"], ["SUPER_ADMIN"])).toBe(true);
      expect(hasRequiredRole(["ADMIN", "SUPER_ADMIN"], ["SUPER_ADMIN"])).toBe(true);
    });

    it("returns false when user lacks all required roles", () => {
      expect(hasRequiredRole(["ADMIN"], ["SUPER_ADMIN"])).toBe(false);
      expect(hasRequiredRole(["USER"], ["ADMIN", "SUPER_ADMIN"])).toBe(false);
      expect(hasRequiredRole([], ["SUPER_ADMIN"])).toBe(false);
    });

    it("returns true when any required role matches", () => {
      expect(hasRequiredRole(["MAESTRO"], ["ADMIN", "MAESTRO"])).toBe(true);
    });
  });

  describe("roleAccessProblem", () => {
    it("produces a 403 problem with listed roles", () => {
      const problem = roleAccessProblem(["SUPER_ADMIN"]);
      expect(problem.status).toBe(403);
      expect(problem.title).toBe("Forbidden");
      expect(problem.detail).toContain("SUPER_ADMIN");
    });

    it("lists multiple roles in detail", () => {
      const problem = roleAccessProblem(["ADMIN", "SUPER_ADMIN"]);
      expect(problem.detail).toContain("ADMIN");
      expect(problem.detail).toContain("SUPER_ADMIN");
    });
  });
});
