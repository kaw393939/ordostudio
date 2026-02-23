/**
 * SQLite adapter for UserAdminPort.
 *
 * This adapter owns the SQL queries for user-status and user-role
 * mutations.  Both CLI and HTTP delivery layers construct this with
 * an open Database instance and pass it to UserAdminService.
 */
import type Database from "better-sqlite3";
import type { UserAdminPort } from "@/core/use-cases/user-admin-service";

export class SqliteUserAdminAdapter implements UserAdminPort {
  constructor(private readonly db: Database.Database) {}

  findUserById(id: string): { id: string; status: string } | null {
    const row = this.db
      .prepare("SELECT id, status FROM users WHERE id = ?")
      .get(id) as { id: string; status: string } | undefined;
    return row ?? null;
  }

  updateUserStatus(id: string, status: string, updatedAt: string): boolean {
    const result = this.db
      .prepare("UPDATE users SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, updatedAt, id);
    return result.changes > 0;
  }

  findRoleByName(name: string): { id: string; name: string } | null {
    const row = this.db
      .prepare("SELECT id, name FROM roles WHERE name = ?")
      .get(name) as { id: string; name: string } | undefined;
    return row ?? null;
  }

  addUserRole(userId: string, roleId: string): boolean {
    const result = this.db
      .prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)")
      .run(userId, roleId);
    return result.changes > 0;
  }

  removeUserRole(userId: string, roleId: string): boolean {
    const result = this.db
      .prepare("DELETE FROM user_roles WHERE user_id = ? AND role_id = ?")
      .run(userId, roleId);
    return result.changes > 0;
  }
}
