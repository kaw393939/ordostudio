import { describe, expect, it } from "vitest";

import {
  MUTABLE_ROLES,
  buildUsersListHref,
  canAddRole,
  canRemoveRole,
} from "../admin-users-ui";

describe("admin users ui helpers", () => {
  it("builds users list href with search, role, and status filters", () => {
    const href = buildUsersListHref({
      search: "  alice@example.com  ",
      role: "ADMIN",
      status: "ACTIVE",
    });

    expect(href).toBe("/api/v1/users?search=alice%40example.com&status=ACTIVE&role=ADMIN");
  });

  it("returns base users href when filters are empty", () => {
    const href = buildUsersListHref({
      search: "   ",
      status: "",
      role: "",
    });

    expect(href).toBe("/api/v1/users");
  });

  it("supports idempotent role actions and excludes super admin mutation", () => {
    expect(MUTABLE_ROLES).toEqual(["AFFILIATE", "APPRENTICE", "MAESTRO", "ADMIN"]);

    expect(canAddRole(["USER"], "AFFILIATE")).toBe(true);
    expect(canAddRole(["USER", "AFFILIATE"], "AFFILIATE")).toBe(false);
    expect(canRemoveRole(["USER", "AFFILIATE"], "AFFILIATE")).toBe(true);
    expect(canRemoveRole(["USER"], "AFFILIATE")).toBe(false);

    expect(canAddRole(["USER"], "ADMIN")).toBe(true);
    expect(canAddRole(["USER", "ADMIN"], "ADMIN")).toBe(false);
    expect(canRemoveRole(["USER", "ADMIN"], "ADMIN")).toBe(true);
    expect(canRemoveRole(["USER"], "ADMIN")).toBe(false);
  });
});
