/**
 * User Admin Application Service
 *
 * Shared orchestrator for user status and role management. Both CLI and
 * HTTP call this instead of duplicating the logic.
 *
 * This module lives in core/use-cases, so it must NOT import from
 * delivery layers (cli/, lib/, app/, components/). DB access goes
 * through the UserAdminPort interface.
 */

/* ── port interface ──────────────────────────────────── */

export interface UserAdminPort {
  findUserById(id: string): { id: string; status: string } | null;
  updateUserStatus(id: string, status: string, updatedAt: string): boolean;
  findRoleByName(name: string): { id: string; name: string } | null;
  addUserRole(userId: string, roleId: string): boolean;
  removeUserRole(userId: string, roleId: string): boolean;
}

/* ── application errors ──────────────────────────────── */

export class UserNotFoundAppError extends Error {
  constructor(public readonly userId: string) {
    super(`User not found: ${userId}`);
    this.name = "UserNotFoundAppError";
  }
}

export class InvalidStatusAppError extends Error {
  constructor(public readonly status: string) {
    super(`Invalid user status: ${status}`);
    this.name = "InvalidStatusAppError";
  }
}

export class RoleForbiddenAppError extends Error {
  constructor(public readonly role: string) {
    super(`Cannot mutate role: ${role}`);
    this.name = "RoleForbiddenAppError";
  }
}

export class RoleNotFoundAppError extends Error {
  constructor(public readonly role: string) {
    super(`Role not found: ${role}`);
    this.name = "RoleNotFoundAppError";
  }
}

/* ── valid statuses ──────────────────────────────────── */

const VALID_STATUSES = new Set(["ACTIVE", "DISABLED", "PENDING"]);
const PROTECTED_ROLES = new Set(["SUPER_ADMIN"]);

/* ── service ─────────────────────────────────────────── */

export class UserAdminService {
  constructor(private readonly port: UserAdminPort) {}

  setStatus(args: { userId: string; status: string }): void {
    const normalized = args.status.trim().toUpperCase();
    if (!VALID_STATUSES.has(normalized)) {
      throw new InvalidStatusAppError(args.status);
    }

    const user = this.port.findUserById(args.userId);
    if (!user) {
      throw new UserNotFoundAppError(args.userId);
    }

    const updatedAt = new Date().toISOString();
    const changed = this.port.updateUserStatus(args.userId, normalized, updatedAt);
    if (!changed) {
      throw new UserNotFoundAppError(args.userId);
    }
  }

  addRole(args: { userId: string; role: string }): { changed: boolean; role: string } {
    const normalized = args.role.trim().toUpperCase();
    if (PROTECTED_ROLES.has(normalized)) {
      throw new RoleForbiddenAppError(normalized);
    }

    const user = this.port.findUserById(args.userId);
    if (!user) {
      throw new UserNotFoundAppError(args.userId);
    }

    const roleRecord = this.port.findRoleByName(normalized);
    if (!roleRecord) {
      throw new RoleNotFoundAppError(normalized);
    }

    const changed = this.port.addUserRole(args.userId, roleRecord.id);
    return { changed, role: normalized };
  }

  removeRole(args: { userId: string; role: string }): { changed: boolean; role: string } {
    const normalized = args.role.trim().toUpperCase();
    if (PROTECTED_ROLES.has(normalized)) {
      throw new RoleForbiddenAppError(normalized);
    }

    const user = this.port.findUserById(args.userId);
    if (!user) {
      throw new UserNotFoundAppError(args.userId);
    }

    const roleRecord = this.port.findRoleByName(normalized);
    if (!roleRecord) {
      return { changed: false, role: normalized };
    }

    const changed = this.port.removeUserRole(args.userId, roleRecord.id);
    return { changed, role: normalized };
  }
}
