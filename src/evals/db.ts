/**
 * Eval database helpers
 *
 * Creates ephemeral SQLite databases (migrate + seed) for each eval run.
 * Mirrors the pattern used in src/app/__tests__/helpers/e2e-fixtures.ts
 * but without the event/registration overhead — evals only need users +
 * core tables.
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { runCli } from "../cli/run-cli";
import type { CliIo } from "../cli/types";
import { resetRateLimits } from "../lib/api/rate-limit";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const activeTempDirs: string[] = [];

function createSilentIo(): CliIo {
  return {
    writeStdout: () => {},
    writeStderr: () => {},
  };
}

async function runWithDb(argv: string[], dbPath: string): Promise<void> {
  const prev = process.env.APPCTL_DB_FILE;
  process.env.APPCTL_DB_FILE = dbPath;
  await runCli(argv, createSilentIo());
  if (prev === undefined) {
    delete process.env.APPCTL_DB_FILE;
  } else {
    process.env.APPCTL_DB_FILE = prev;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface EvalDb {
  dbPath: string;
  db: Database.Database;
  /** User IDs created during setup */
  userId: string;
  adminId: string;
}

/**
 * Create a fresh database with all migrations applied, seed data loaded,
 * and two users created: a regular user and an admin.
 *
 * Caller must call `teardownEvalDb(evalDb)` after the scenario completes.
 */
export async function setupEvalDb(): Promise<EvalDb> {
  const dir = await mkdtemp(join(tmpdir(), "eval-db-"));
  activeTempDirs.push(dir);
  const dbPath = join(dir, "app.db");

  process.env.APPCTL_DB_FILE = dbPath;
  process.env.APPCTL_ENV = "local";

  // Reset rate limits so sequential scenario setups don't hit the auth limiter
  resetRateLimits();

  await runWithDb(["db", "migrate"], dbPath);
  await runWithDb(["db", "seed"], dbPath);

  // Re-set after seed (seed resets the env var)
  process.env.APPCTL_DB_FILE = dbPath;

  // Register two users via the auth API (direct module import — no HTTP)
  const { POST: postRegister } = await import(
    "../app/api/v1/auth/register/route"
  );

  async function register(email: string) {
    return postRegister(
      new Request("http://localhost:3000/api/v1/auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
        },
        body: JSON.stringify({ email, password: "EvalPass123!" }),
      }),
    );
  }

  await register("evaluser@example.com");
  await register("evaladmin@example.com");

  // Grant admin role
  const db = new Database(dbPath);
  const adminUser = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get("evaladmin@example.com") as { id: string };
  const user = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get("evaluser@example.com") as { id: string };
  const adminRole = db
    .prepare("SELECT id FROM roles WHERE name = 'ADMIN'")
    .get() as { id: string };
  db.prepare("INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)")
    .run(adminUser.id, adminRole.id);

  return {
    dbPath,
    db,
    userId: user.id,
    adminId: adminUser.id,
  };
}

/**
 * Close the database connection and delete the temp directory.
 */
export async function teardownEvalDb(evalDb: EvalDb): Promise<void> {
  try {
    evalDb.db.close();
  } catch {
    // ignore
  }
  delete process.env.APPCTL_DB_FILE;
  delete process.env.APPCTL_ENV;
}

/**
 * Teardown all databases created during this process (call at end of run).
 */
export async function teardownAllEvalDbs(): Promise<void> {
  await Promise.all(
    activeTempDirs.splice(0).map((dir) =>
      rm(dir, { recursive: true, force: true }),
    ),
  );
}
