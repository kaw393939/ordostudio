import { openCliDb } from "@/platform/db";
import { AppConfig } from "./types";

export interface UserRecord {
  id: string;
  email: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const listUsers = (
  config: AppConfig,
  filters: { role?: string; status?: string; search?: string },
): UserRecord[] => {
  const db = openCliDb(config);
  try {
    const params: unknown[] = [];
    const clauses: string[] = [];
    const joins: string[] = [];

    if (filters.role) {
      joins.push("JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id");
      clauses.push("r.name = ?");
      params.push(filters.role.toUpperCase());
    }

    if (filters.status) {
      clauses.push("u.status = ?");
      params.push(filters.status.toUpperCase());
    }

    if (filters.search) {
      clauses.push("u.email LIKE ?");
      params.push(`%${filters.search}%`);
    }

    const query = `
SELECT DISTINCT u.id, u.email, u.status, u.created_at, u.updated_at
FROM users u
${joins.join(" ")}
${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
ORDER BY u.created_at ASC
`;

    return db.prepare(query).all(...params) as UserRecord[];
  } finally {
    db.close();
  }
};

export const findUserById = (config: AppConfig, id: string): UserRecord | undefined => {
  const db = openCliDb(config);
  try {
    return db.prepare("SELECT id, email, status, created_at, updated_at FROM users WHERE id = ?").get(id) as
      | UserRecord
      | undefined;
  } finally {
    db.close();
  }
};

export const findUserByEmail = (config: AppConfig, email: string): UserRecord | undefined => {
  const db = openCliDb(config);
  try {
    return db.prepare("SELECT id, email, status, created_at, updated_at FROM users WHERE email = ?").get(email) as
      | UserRecord
      | undefined;
  } finally {
    db.close();
  }
};
