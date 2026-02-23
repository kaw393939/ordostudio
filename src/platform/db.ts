/**
 * Platform-layer database access.
 *
 * Opens and configures a SQLite connection using the shared AppConfig.
 * This is the single canonical way to obtain a database handle.
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";
import type { AppConfig } from "./types";

/**
 * Open (or create) a SQLite database with standard pragmas applied.
 *
 * Historically named `openCliDb` — the `openDb` name reflects that
 * the database is not CLI-specific.
 */
export const openDb = (config: AppConfig): Database.Database => {
  const dbPath = resolve(config.db.file);
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma(`busy_timeout = ${config.db.busyTimeoutMs}`);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  return db;
};

/** Backward-compatible alias. Prefer `openDb`. */
export const openCliDb = openDb;

/**
 * Run `fn` inside a SQLite transaction.
 *
 * Commits if `fn` returns normally; rolls back and re-throws if `fn` throws.
 * Uses better-sqlite3's built-in transaction support for correctness.
 */
export function withTransaction<T>(db: Database.Database, fn: () => T): T {
  const wrapped = db.transaction(fn);
  return wrapped();
}
