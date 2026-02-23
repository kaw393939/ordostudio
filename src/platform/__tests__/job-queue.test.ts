import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { SqliteJobQueue } from "@/platform/job-queue";
import type { JobPayload } from "@/core/ports/job-queue";

const JOB_QUEUE_DDL = `
CREATE TABLE job_queue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  run_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  failed_at TEXT
);
CREATE INDEX idx_job_queue_status_run_at ON job_queue(status, run_at);
CREATE INDEX idx_job_queue_type ON job_queue(type);
`;

let db: Database.Database;
let queue: SqliteJobQueue;

beforeEach(() => {
  db = new Database(":memory:");
  db.exec(JOB_QUEUE_DDL);
  queue = new SqliteJobQueue(db);
});

afterEach(() => {
  db.close();
});

describe("SqliteJobQueue", () => {
  describe("enqueue", () => {
    it("inserts a pending job with default settings", () => {
      const id = queue.enqueue({ type: "email.send", data: { to: "a@b.com" } });
      expect(id).toBeTruthy();

      const job = queue.getJob(id);
      expect(job).not.toBeNull();
      expect(job!.type).toBe("email.send");
      expect(job!.status).toBe("pending");
      expect(job!.attempts).toBe(0);
      expect(job!.maxRetries).toBe(3);
      expect(job!.data).toEqual({ to: "a@b.com" });
    });

    it("respects custom runAt and maxRetries", () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      const id = queue.enqueue(
        { type: "newsletter.send", data: { sendRunId: "abc" } },
        { runAt: future, maxRetries: 5 },
      );

      const job = queue.getJob(id);
      expect(job!.runAt).toBe(future);
      expect(job!.maxRetries).toBe(5);
    });
  });

  describe("processNext", () => {
    it("processes a pending job and marks it completed", async () => {
      const handled: JobPayload[] = [];
      const id = queue.enqueue({ type: "test.job", data: { x: 1 } });

      const processed = await queue.processNext(async (job) => {
        handled.push(job);
      });

      expect(processed).toBe(true);
      expect(handled).toHaveLength(1);
      expect(handled[0].type).toBe("test.job");
      expect(handled[0].data).toEqual({ x: 1 });

      const job = queue.getJob(id);
      expect(job!.status).toBe("completed");
      expect(job!.completedAt).toBeTruthy();
      expect(job!.attempts).toBe(1);
    });

    it("returns false when no jobs are available", async () => {
      const processed = await queue.processNext(async () => {});
      expect(processed).toBe(false);
    });

    it("does not process jobs scheduled in the future", async () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      queue.enqueue(
        { type: "future.job", data: {} },
        { runAt: future },
      );

      const processed = await queue.processNext(async () => {});
      expect(processed).toBe(false);
    });

    it("marks a failed job as failed with error message and increments attempts", async () => {
      const id = queue.enqueue(
        { type: "flaky.job", data: {} },
        { maxRetries: 3 },
      );

      await queue.processNext(async () => {
        throw new Error("connection timeout");
      });

      const job = queue.getJob(id);
      expect(job!.status).toBe("failed");
      expect(job!.lastError).toBe("connection timeout");
      expect(job!.attempts).toBe(1);
      expect(job!.failedAt).toBeTruthy();
    });

    it("marks a job as dead after exhausting max retries", async () => {
      const id = queue.enqueue(
        { type: "doomed.job", data: {} },
        { maxRetries: 1 },
      );

      // First attempt → dead (maxRetries = 1, attempts becomes 1 which == maxRetries)
      await queue.processNext(async () => {
        throw new Error("permanent failure");
      });

      const job = queue.getJob(id);
      expect(job!.status).toBe("dead");
      expect(job!.lastError).toBe("permanent failure");
      expect(job!.attempts).toBe(1);
    });

    it("retries a failed job on subsequent processNext call", async () => {
      const id = queue.enqueue(
        { type: "retry.job", data: {} },
        { maxRetries: 3 },
      );

      // First attempt fails
      await queue.processNext(async () => {
        throw new Error("temporary error");
      });

      let job = queue.getJob(id);
      expect(job!.status).toBe("failed");

      // Override run_at to now so it's eligible again
      db.prepare("UPDATE job_queue SET run_at = ? WHERE id = ?").run(
        new Date().toISOString(),
        id,
      );

      // Second attempt succeeds
      const handled: JobPayload[] = [];
      await queue.processNext(async (j) => {
        handled.push(j);
      });

      job = queue.getJob(id);
      expect(job!.status).toBe("completed");
      expect(job!.attempts).toBe(2);
      expect(handled).toHaveLength(1);
    });

    it("processes jobs in run_at order", async () => {
      const order: string[] = [];
      const t1 = new Date(Date.now() - 2000).toISOString();
      const t2 = new Date(Date.now() - 1000).toISOString();

      queue.enqueue({ type: "second", data: {} }, { runAt: t2 });
      queue.enqueue({ type: "first", data: {} }, { runAt: t1 });

      await queue.processNext(async (job) => order.push(job.type));
      await queue.processNext(async (job) => order.push(job.type));

      expect(order).toEqual(["first", "second"]);
    });

    it("each processNext claims a different job", async () => {
      queue.enqueue({ type: "a", data: {} });
      queue.enqueue({ type: "b", data: {} });

      const types: string[] = [];
      await queue.processNext(async (job) => types.push(job.type));
      await queue.processNext(async (job) => types.push(job.type));

      expect(types).toHaveLength(2);
      expect(new Set(types).size).toBe(2);
    });
  });

  describe("getStats", () => {
    it("returns correct counts by status", async () => {
      // 2 pending
      queue.enqueue({ type: "a", data: {} });
      queue.enqueue({ type: "b", data: {} });

      // 1 completed
      queue.enqueue({ type: "c", data: {} });
      await queue.processNext(async () => {});

      // 1 failed
      queue.enqueue({ type: "d", data: {} }, { maxRetries: 3 });
      await queue.processNext(async () => {
        throw new Error("fail");
      });
      // Override run_at to future so it's not re-processed
      db.prepare(
        "UPDATE job_queue SET run_at = ? WHERE status = 'failed'",
      ).run(new Date(Date.now() + 60_000).toISOString());

      const stats = queue.getStats();
      expect(stats.pending).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
    });

    it("returns zeros for empty queue", () => {
      const stats = queue.getStats();
      expect(stats).toEqual({
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        dead: 0,
      });
    });
  });

  describe("getRecentFailed", () => {
    it("returns failed and dead jobs ordered by failed_at desc", async () => {
      queue.enqueue({ type: "a", data: {} }, { maxRetries: 1 });
      await queue.processNext(async () => {
        throw new Error("err1");
      });

      queue.enqueue({ type: "b", data: {} }, { maxRetries: 3 });
      await queue.processNext(async () => {
        throw new Error("err2");
      });

      const recent = queue.getRecentFailed(10);
      expect(recent).toHaveLength(2);
      // Both should be returned (one dead, one failed)
      const statuses = recent.map((r) => r.status).sort();
      expect(statuses).toEqual(["dead", "failed"]);
    });
  });

  describe("retryDead", () => {
    it("re-enqueues dead jobs as pending with reset attempts", async () => {
      const id = queue.enqueue({ type: "dead.job", data: {} }, { maxRetries: 1 });
      await queue.processNext(async () => {
        throw new Error("dead");
      });

      expect(queue.getJob(id)!.status).toBe("dead");

      const count = queue.retryDead();
      expect(count).toBe(1);

      const job = queue.getJob(id);
      expect(job!.status).toBe("pending");
      expect(job!.attempts).toBe(0);
      expect(job!.lastError).toBeNull();
    });
  });

  describe("purgeCompleted", () => {
    it("deletes completed jobs older than cutoff", async () => {
      queue.enqueue({ type: "old", data: {} });
      await queue.processNext(async () => {});

      // Set completed_at to the past
      db.prepare(
        "UPDATE job_queue SET completed_at = '2020-01-01T00:00:00.000Z' WHERE status = 'completed'",
      ).run();

      const purged = queue.purgeCompleted("2024-01-01T00:00:00.000Z");
      expect(purged).toBe(1);
      expect(queue.getStats().completed).toBe(0);
    });

    it("does not purge recent completed jobs", async () => {
      queue.enqueue({ type: "recent", data: {} });
      await queue.processNext(async () => {});

      const purged = queue.purgeCompleted("2020-01-01T00:00:00.000Z");
      expect(purged).toBe(0);
      expect(queue.getStats().completed).toBe(1);
    });
  });

  describe("recoverStale", () => {
    it("resets stale running jobs to pending", () => {
      const id = queue.enqueue({ type: "stuck", data: {} });
      // Manually set to running with old started_at
      db.prepare(
        "UPDATE job_queue SET status = 'running', started_at = ? WHERE id = ?",
      ).run("2020-01-01T00:00:00.000Z", id);

      const recovered = queue.recoverStale(5 * 60 * 1000);
      expect(recovered).toBe(1);

      const job = queue.getJob(id);
      expect(job!.status).toBe("pending");
      expect(job!.startedAt).toBeNull();
    });

    it("does not reset recently started jobs", () => {
      const id = queue.enqueue({ type: "active", data: {} });
      db.prepare(
        "UPDATE job_queue SET status = 'running', started_at = ? WHERE id = ?",
      ).run(new Date().toISOString(), id);

      const recovered = queue.recoverStale(5 * 60 * 1000);
      expect(recovered).toBe(0);
      expect(queue.getJob(id)!.status).toBe("running");
    });
  });
});
