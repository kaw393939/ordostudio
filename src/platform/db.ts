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

// Load sqlite-vec extension for vector similarity queries.
// The import is dynamic so that builds without the native binary still work;
// any error is silently suppressed and vector search falls back to keyword mode.
type SqliteVecModule = { load: (db: Database.Database) => void };
let sqliteVec: SqliteVecModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  sqliteVec = require("sqlite-vec") as SqliteVecModule;
} catch {
  // sqlite-vec not available (e.g. unsupported platform); fall back to keyword search
}

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

  // Load vector extension if available
  if (sqliteVec) {
    try {
      sqliteVec.load(db);
    } catch {
      // SQLite version or platform incompatibility — continue without vec functions
    }
  }

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
