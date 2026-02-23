import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { SqliteJobQueue } from "@/platform/job-queue";
import { JobProcessor } from "@/platform/job-processor";
import {
  createEmailSendHandler,
  createNewsletterSendHandler,
  createDiscordSyncHandler,
  createStripeWebhookHandler,
  buildHandlerMap,
} from "@/platform/job-handlers";
import type { TransactionalEmailPort, TransactionalEmailMessage, EmailSendResult } from "@/core/ports/transactional-email";
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
`;

class FakeEmailPort implements TransactionalEmailPort {
  sent: TransactionalEmailMessage[] = [];
  shouldFail = false;

  async send(msg: TransactionalEmailMessage): Promise<EmailSendResult> {
    if (this.shouldFail) return { ok: false, error: "SMTP timeout" };
    this.sent.push(msg);
    return { ok: true, messageId: "fake-id" };
  }
}

let db: Database.Database;
let queue: SqliteJobQueue;

beforeEach(() => {
  db = new Database(":memory:");
  db.exec(JOB_QUEUE_DDL);
  queue = new SqliteJobQueue(db);
  setLogger(pino({ level: "silent" }));
});

afterEach(() => {
  db.close();
  resetLogger();
});

describe("email.send handler", () => {
  it("sends email via the email port on success", async () => {
    const port = new FakeEmailPort();
    const handler = createEmailSendHandler(port);

    const id = queue.enqueue({
      type: "email.send",
      data: { to: "user@test.com", subject: "Hello", textBody: "Hi", htmlBody: "<p>Hi</p>" },
    });

    await queue.processNext(handler);

    expect(port.sent).toHaveLength(1);
    expect(port.sent[0].to).toBe("user@test.com");
    expect(queue.getJob(id)!.status).toBe("completed");
  });

  it("throws on email port failure so the job retries", async () => {
    const port = new FakeEmailPort();
    port.shouldFail = true;
    const handler = createEmailSendHandler(port);

    const id = queue.enqueue({
      type: "email.send",
      data: { to: "fail@test.com", subject: "Fail", textBody: "x", htmlBody: "x" },
    });

    await queue.processNext(handler);

    const job = queue.getJob(id)!;
    expect(job.status).toBe("failed");
    expect(job.lastError).toContain("SMTP timeout");
  });

  it("email retry succeeds after fix", async () => {
    const port = new FakeEmailPort();
    port.shouldFail = true;
    const handler = createEmailSendHandler(port);

    const id = queue.enqueue({
      type: "email.send",
      data: { to: "retry@test.com", subject: "Retry", textBody: "x", htmlBody: "x" },
    });

    // First attempt fails
    await queue.processNext(handler);
    expect(queue.getJob(id)!.status).toBe("failed");

    // Fix the port
    port.shouldFail = false;
    // Reset run_at so it's eligible
    db.prepare("UPDATE job_queue SET run_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      id,
    );

    // Second attempt succeeds
    await queue.processNext(handler);
    expect(queue.getJob(id)!.status).toBe("completed");
    expect(port.sent).toHaveLength(1);
  });
});

describe("newsletter.send handler", () => {
  it("calls the dispatch function", async () => {
    let called = false;
    const handler = createNewsletterSendHandler(async () => {
      called = true;
      return { dispatched: 5 };
    });

    queue.enqueue({ type: "newsletter.send", data: { sendRunId: "run-1" } });
    await queue.processNext(handler);

    expect(called).toBe(true);
  });
});

describe("discord.sync handler", () => {
  it("calls sync function with userId and entitlementIds", async () => {
    const calls: { userId: string; ids: string[] }[] = [];
    const handler = createDiscordSyncHandler(async (userId, ids) => {
      calls.push({ userId, ids });
    });

    queue.enqueue({
      type: "discord.sync",
      data: { userId: "user-1", entitlementIds: ["ent-a", "ent-b"] },
    });
    await queue.processNext(handler);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ userId: "user-1", ids: ["ent-a", "ent-b"] });
  });
});

describe("stripe.webhook.process handler", () => {
  it("calls the process function with payload and signature", async () => {
    const calls: { payload: string; sig: string; reqId: string }[] = [];
    const handler = createStripeWebhookHandler(async (payload, sig, reqId) => {
      calls.push({ payload, sig, reqId });
      return { ok: true };
    });

    queue.enqueue({
      type: "stripe.webhook.process",
      data: { payload: '{"type":"checkout.session.completed"}', signature: "sig-abc", requestId: "req-1" },
    });
    await queue.processNext(handler);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload).toContain("checkout.session.completed");
    expect(calls[0].sig).toBe("sig-abc");
  });
});

describe("buildHandlerMap", () => {
  it("builds a map with all 4 handler types", () => {
    const port = new FakeEmailPort();
    const map = buildHandlerMap({
      emailPort: port,
      newsletterDispatchFn: async () => ({ dispatched: 0 }),
      discordSyncFn: async () => {},
      stripeWebhookFn: async () => ({}),
    });

    expect(map.size).toBe(4);
    expect(map.has("email.send")).toBe(true);
    expect(map.has("newsletter.send")).toBe(true);
    expect(map.has("discord.sync")).toBe(true);
    expect(map.has("stripe.webhook.process")).toBe(true);
  });
});

describe("end-to-end: job queue → processor → handler", () => {
  it("password reset email enqueued and processed via job queue", async () => {
    const port = new FakeEmailPort();
    const handlers = new Map<string, JobHandler>();
    handlers.set("email.send", createEmailSendHandler(port));

    const processor = new JobProcessor(queue, handlers);

    // Simulate the auth flow enqueuing an email job
    const id = queue.enqueue({
      type: "email.send",
      data: {
        to: "reset@example.com",
        subject: "Password Reset",
        textBody: "Click here to reset: https://...",
        htmlBody: "<p>Click here</p>",
        tag: "password-reset",
      },
    });

    // Verify job is pending
    expect(queue.getStats().pending).toBe(1);

    // Process the job
    const processed = await processor.tick();
    expect(processed).toBe(true);

    // Verify email was sent
    expect(port.sent).toHaveLength(1);
    expect(port.sent[0].to).toBe("reset@example.com");
    expect(port.sent[0].tag).toBe("password-reset");

    // Verify job completed
    expect(queue.getJob(id)!.status).toBe("completed");
    expect(queue.getStats().completed).toBe(1);
  });

  it("failed email job retries and eventually goes dead", async () => {
    const port = new FakeEmailPort();
    port.shouldFail = true;
    const handlers = new Map<string, JobHandler>();
    handlers.set("email.send", createEmailSendHandler(port));

    const processor = new JobProcessor(queue, handlers);
    const id = queue.enqueue(
      { type: "email.send", data: { to: "fail@test.com", subject: "X", textBody: "x", htmlBody: "x" } },
      { maxRetries: 2 },
    );

    // Attempt 1 → failed
    await processor.tick();
    expect(queue.getJob(id)!.status).toBe("failed");

    // Reset run_at for retry
    db.prepare("UPDATE job_queue SET run_at = ? WHERE id = ?").run(
      new Date().toISOString(), id,
    );

    // Attempt 2 → dead (maxRetries exhausted)
    await processor.tick();
    expect(queue.getJob(id)!.status).toBe("dead");
    expect(queue.getJob(id)!.attempts).toBe(2);

    // Retry dead → now succeeds
    port.shouldFail = false;
    queue.retryDead();
    expect(queue.getJob(id)!.status).toBe("pending");

    await processor.tick();
    expect(queue.getJob(id)!.status).toBe("completed");
    expect(port.sent).toHaveLength(1);
  });
});
