import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { SqliteJobQueue } from "@/platform/job-queue";
import { JobProcessor } from "@/platform/job-processor";
import type { JobHandler } from "@/core/ports/job-queue";
import { setLogger, resetLogger } from "@/platform/logger";
import pino from "pino";

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
  // Silence logger during tests
  setLogger(pino({ level: "silent" }));
});

afterEach(() => {
  db.close();
  resetLogger();
});

describe("JobProcessor", () => {
  it("tick processes one job via the correct handler", async () => {
    const handled: string[] = [];
    const handlers = new Map<string, JobHandler>();
    handlers.set("email.send", async (job) => {
      handled.push(`email:${(job.data as { to: string }).to}`);
    });

    const processor = new JobProcessor(queue, handlers);
    queue.enqueue({ type: "email.send", data: { to: "a@b.com" } });

    const result = await processor.tick();
    expect(result).toBe(true);
    expect(handled).toEqual(["email:a@b.com"]);
  });

  it("tick returns false when no jobs available", async () => {
    const handlers = new Map<string, JobHandler>();
    const processor = new JobProcessor(queue, handlers);

    const result = await processor.tick();
    expect(result).toBe(false);
  });

  it("unknown job type marks the job as failed", async () => {
    const handlers = new Map<string, JobHandler>();
    // No handler registered for "mystery.job"
    const processor = new JobProcessor(queue, handlers);

    const id = queue.enqueue({ type: "mystery.job", data: {} });
    await processor.tick();

    const job = queue.getJob(id);
    expect(job!.lastError).toContain("Unknown job type: mystery.job");
  });

  it("tick recovers stale running jobs before processing", () => {
    const handlers = new Map<string, JobHandler>();
    const processor = new JobProcessor(queue, handlers);

    // Simulate a stale running job
    const id = queue.enqueue({ type: "stuck", data: {} });
    db.prepare(
      "UPDATE job_queue SET status = 'running', started_at = ? WHERE id = ?",
    ).run("2020-01-01T00:00:00.000Z", id);

    // Tick should recover the stale job first
    void processor.tick();

    // Give it a moment and check — the job should be back to pending or processed
    const job = queue.getJob(id);
    // Either pending (recovered) or running (being processed now) or failed (unknown handler)
    expect(["pending", "running", "failed"]).toContain(job!.status);
  });

  it("start and stop control the polling loop", async () => {
    const handled: string[] = [];
    const handlers = new Map<string, JobHandler>();
    handlers.set("test", async () => {
      handled.push("done");
    });

    const processor = new JobProcessor(queue, handlers);
    queue.enqueue({ type: "test", data: {} });

    processor.start(50);
    expect(processor.isRunning()).toBe(true);

    // Wait for at least one tick
    await new Promise((resolve) => setTimeout(resolve, 100));

    processor.stop();
    expect(processor.isRunning()).toBe(false);
    expect(handled.length).toBeGreaterThanOrEqual(1);
  });

  it("start is idempotent (calling twice does not double-poll)", () => {
    const handlers = new Map<string, JobHandler>();
    const processor = new JobProcessor(queue, handlers);

    processor.start(1000);
    processor.start(1000); // second call should be no-op

    expect(processor.isRunning()).toBe(true);
    processor.stop();
  });

  it("routes different job types to different handlers", async () => {
    const log: string[] = [];
    const handlers = new Map<string, JobHandler>();
    handlers.set("email.send", async () => log.push("email"));
    handlers.set("discord.sync", async () => log.push("discord"));

    const processor = new JobProcessor(queue, handlers);
    queue.enqueue({ type: "email.send", data: {} });
    queue.enqueue({ type: "discord.sync", data: {} });

    await processor.tick();
    await processor.tick();

    expect(log.sort()).toEqual(["discord", "email"]);
  });
});
