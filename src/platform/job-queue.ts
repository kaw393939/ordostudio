/**
 * SQLite-backed job queue implementation.
 *
 * Uses better-sqlite3 for synchronous operations with atomic
 * claim-and-process semantics. No external dependencies (Redis, etc.).
 */
import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type {
  JobQueuePort,
  JobPayload,
  EnqueueOptions,
  JobRecord,
  JobStats,
} from "@/core/ports/job-queue";

/**
 * Thrown by SqliteJobQueue.enqueue when a type string is not in the
 * configured knownTypes set.  Fails fast before the job is persisted,
 * surfacing integration errors at enqueue time rather than at processing time.
 */
export class UnknownJobTypeError extends Error {
  constructor(public readonly jobType: string) {
    super(`Unknown job type: ${jobType}`);
    this.name = "UnknownJobTypeError";
  }
}

interface DbJobRow {
  id: string;
  type: string;
  data: string;
  status: string;
  run_at: string;
  attempts: number;
  max_retries: number;
  last_error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
}

function rowToRecord(row: DbJobRow): JobRecord {
  return {
    id: row.id,
    type: row.type,
    data: JSON.parse(row.data),
    status: row.status as JobRecord["status"],
    runAt: row.run_at,
    attempts: row.attempts,
    maxRetries: row.max_retries,
    lastError: row.last_error,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    failedAt: row.failed_at,
  };
}

export class SqliteJobQueue implements JobQueuePort {
  constructor(
    private readonly db: Database.Database,
    private readonly knownTypes?: ReadonlySet<string>,
  ) {}

  enqueue(job: JobPayload, options?: EnqueueOptions): string {
    if (this.knownTypes && !this.knownTypes.has(job.type)) {
      throw new UnknownJobTypeError(job.type);
    }
    const id = randomUUID();
    const now = new Date().toISOString();
    const runAt = options?.runAt ?? now;
    const maxRetries = options?.maxRetries ?? 3;

    this.db
      .prepare(
        `INSERT INTO job_queue (id, type, data, status, run_at, attempts, max_retries, created_at)
         VALUES (?, ?, ?, 'pending', ?, 0, ?, ?)`,
      )
      .run(id, job.type, JSON.stringify(job.data), runAt, maxRetries, now);

    return id;
  }

  async processNext(
    handler: (job: JobPayload) => Promise<void>,
  ): Promise<boolean> {
    const now = new Date().toISOString();

    // Atomically claim the next eligible job
    const row = this.db
      .prepare(
        `UPDATE job_queue
         SET status = 'running', started_at = ?, attempts = attempts + 1
         WHERE id = (
           SELECT id FROM job_queue
           WHERE status IN ('pending', 'failed') AND run_at <= ?
           ORDER BY run_at ASC
           LIMIT 1
         )
         RETURNING *`,
      )
      .get(now, now) as DbJobRow | undefined;

    if (!row) return false;

    try {
      await handler({ type: row.type, data: JSON.parse(row.data) });
      this.db
        .prepare(
          `UPDATE job_queue SET status = 'completed', completed_at = ? WHERE id = ?`,
        )
        .run(new Date().toISOString(), row.id);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : String(err);
      const attempts = row.attempts; // already incremented by the RETURNING

      if (attempts >= row.max_retries) {
        // Exhausted retries → dead letter
        this.db
          .prepare(
            `UPDATE job_queue SET status = 'dead', last_error = ?, failed_at = ? WHERE id = ?`,
          )
          .run(errorMsg, new Date().toISOString(), row.id);
      } else {
        // Schedule retry with exponential backoff: 30s * 2^attempt
        const delayMs = 30_000 * Math.pow(2, attempts - 1);
        const retryAt = new Date(Date.now() + delayMs).toISOString();
        this.db
          .prepare(
            `UPDATE job_queue SET status = 'failed', last_error = ?, failed_at = ?, run_at = ? WHERE id = ?`,
          )
          .run(errorMsg, new Date().toISOString(), retryAt, row.id);
      }
    }

    return true;
  }

  getStats(): JobStats {
    const rows = this.db
      .prepare(
        `SELECT status, COUNT(*) as count FROM job_queue GROUP BY status`,
      )
      .all() as { status: string; count: number }[];

    const stats: JobStats = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      dead: 0,
    };
    for (const row of rows) {
      if (row.status in stats) {
        stats[row.status as keyof JobStats] = row.count;
      }
    }
    return stats;
  }

  getRecentFailed(limit = 20): JobRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM job_queue
         WHERE status IN ('failed', 'dead')
         ORDER BY failed_at DESC
         LIMIT ?`,
      )
      .all(limit) as DbJobRow[];

    return rows.map(rowToRecord);
  }

  retryDead(): number {
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `UPDATE job_queue
         SET status = 'pending', attempts = 0, last_error = NULL, failed_at = NULL, run_at = ?
         WHERE status = 'dead'`,
      )
      .run(now);
    return result.changes;
  }

  purgeCompleted(before: string): number {
    const result = this.db
      .prepare(
        `DELETE FROM job_queue WHERE status = 'completed' AND completed_at < ?`,
      )
      .run(before);
    return result.changes;
  }

  recoverStale(timeoutMs: number): number {
    const cutoff = new Date(Date.now() - timeoutMs).toISOString();
    const result = this.db
      .prepare(
        `UPDATE job_queue
         SET status = 'pending', started_at = NULL
         WHERE status = 'running' AND started_at < ?`,
      )
      .run(cutoff);
    return result.changes;
  }

  /** Get a single job by ID (primarily for testing). */
  getJob(id: string): JobRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM job_queue WHERE id = ?`)
      .get(id) as DbJobRow | undefined;
    return row ? rowToRecord(row) : null;
  }
}
