/**
 * TDD-14: Application service — User Admin
 *
 * These tests verify the shared user admin application service that
 * CLI and HTTP call instead of duplicating logic. Uses in-memory
 * port stubs — no SQLite, no Next.js, no Commander.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  UserAdminService,
  type UserAdminPort,
  UserNotFoundAppError,
  InvalidStatusAppError,
  RoleForbiddenAppError,
  RoleNotFoundAppError,
} from "@/core/use-cases/user-admin-service";

/* ── in-memory stub ──────────────────────────────────── */

type StoredUser = {
  id: string;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
  roles: string[];
};

type StoredRole = { id: string; name: string };

const createStub = (): UserAdminPort & { _users: StoredUser[]; _roles: StoredRole[] } => {
  const _users: StoredUser[] = [];
  const _roles: StoredRole[] = [
    { id: "r-admin", name: "ADMIN" },
    { id: "r-super", name: "SUPER_ADMIN" },
    { id: "r-maestro", name: "MAESTRO" },
  ];

  return {
    _users,
    _roles,

    findUserById(id: string) {
      return _users.find((u) => u.id === id) ?? null;
    },

    updateUserStatus(id: string, status: string, updatedAt: string) {
      const u = _users.find((u) => u.id === id);
      if (!u) return false;
      u.status = status;
      u.updated_at = updatedAt;
      return true;
    },

    findRoleByName(name: string) {
      const r = _roles.find((r) => r.name === name);
      return r ? { id: r.id, name: r.name } : null;
    },

    addUserRole(userId: string, roleId: string) {
      const u = _users.find((u) => u.id === userId);
      if (!u) return false;
      if (!u.roles.includes(roleId)) {
        u.roles.push(roleId);
      }
      return true;
    },

    removeUserRole(userId: string, roleId: string) {
      const u = _users.find((u) => u.id === userId);
      if (!u) return false;
      const idx = u.roles.indexOf(roleId);
      if (idx >= 0) {
        u.roles.splice(idx, 1);
        return true;
      }
      return false;
    },
  };
};

/* ── tests ───────────────────────────────────────────── */

describe("UserAdminService — setStatus", () => {
  let stub: ReturnType<typeof createStub>;
  let svc: UserAdminService;

  beforeEach(() => {
    stub = createStub();
    svc = new UserAdminService(stub);
    stub._users.push({
      id: "u1",
      email: "a@b.com",
      status: "ACTIVE",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      roles: [],
    });
  });

  it("disables an active user", () => {
    svc.setStatus({ userId: "u1", status: "DISABLED" });
    expect(stub._users[0].status).toBe("DISABLED");
  });

  it("activates a disabled user", () => {
    stub._users[0].status = "DISABLED";
    svc.setStatus({ userId: "u1", status: "ACTIVE" });
    expect(stub._users[0].status).toBe("ACTIVE");
  });

  it("normalizes status to uppercase", () => {
    svc.setStatus({ userId: "u1", status: "disabled" });
    expect(stub._users[0].status).toBe("DISABLED");
  });

  it("throws UserNotFoundAppError for unknown id", () => {
    expect(() => svc.setStatus({ userId: "missing", status: "DISABLED" })).toThrow(UserNotFoundAppError);
  });

  it("throws InvalidStatusAppError for unknown status", () => {
    expect(() => svc.setStatus({ userId: "u1", status: "BOGUS" })).toThrow(InvalidStatusAppError);
  });
});

describe("UserAdminService — addRole", () => {
  let stub: ReturnType<typeof createStub>;
  let svc: UserAdminService;

  beforeEach(() => {
    stub = createStub();
    svc = new UserAdminService(stub);
    stub._users.push({
      id: "u1",
      email: "a@b.com",
      status: "ACTIVE",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      roles: [],
    });
  });

  it("adds a role", () => {
    const result = svc.addRole({ userId: "u1", role: "ADMIN" });
    expect(result.changed).toBe(true);
  });

  it("normalizes role to uppercase", () => {
    const result = svc.addRole({ userId: "u1", role: "admin" });
    expect(result.changed).toBe(true);
  });

  it("throws UserNotFoundAppError for unknown user", () => {
    expect(() => svc.addRole({ userId: "missing", role: "ADMIN" })).toThrow(UserNotFoundAppError);
  });

  it("throws RoleForbiddenAppError for SUPER_ADMIN", () => {
    expect(() => svc.addRole({ userId: "u1", role: "SUPER_ADMIN" })).toThrow(RoleForbiddenAppError);
  });

  it("throws RoleNotFoundAppError for unknown role name", () => {
    expect(() => svc.addRole({ userId: "u1", role: "WIZARD" })).toThrow(RoleNotFoundAppError);
  });
});

describe("UserAdminService — removeRole", () => {
  let stub: ReturnType<typeof createStub>;
  let svc: UserAdminService;

  beforeEach(() => {
    stub = createStub();
    svc = new UserAdminService(stub);
    stub._users.push({
      id: "u1",
      email: "a@b.com",
      status: "ACTIVE",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      roles: ["r-admin"],
    });
  });

  it("removes a role", () => {
    const result = svc.removeRole({ userId: "u1", role: "ADMIN" });
    expect(result.changed).toBe(true);
  });

  it("returns changed:false when role not assigned", () => {
    const result = svc.removeRole({ userId: "u1", role: "MAESTRO" });
    expect(result.changed).toBe(false);
  });

  it("throws RoleForbiddenAppError for SUPER_ADMIN", () => {
    expect(() => svc.removeRole({ userId: "u1", role: "SUPER_ADMIN" })).toThrow(RoleForbiddenAppError);
  });

  it("throws UserNotFoundAppError for unknown user", () => {
    expect(() => svc.removeRole({ userId: "missing", role: "ADMIN" })).toThrow(UserNotFoundAppError);
  });
});
