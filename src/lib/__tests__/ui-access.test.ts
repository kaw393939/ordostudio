import { describe, expect, it } from "vitest";

import { canAccessAdminFromMe } from "../ui-access";

describe("ui access", () => {
  it("allows admin when /me exposes users affordance", () => {
    const allowed = canAccessAdminFromMe({
      _links: {
        self: { href: "/api/v1/me" },
        users: { href: "/api/v1/users" },
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
});
