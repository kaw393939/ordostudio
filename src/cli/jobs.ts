/**
 * CLI jobs commands — manage the background job queue.
 */
import Database from "better-sqlite3";
import { SqliteJobQueue } from "@/platform/job-queue";
import { JobProcessor } from "@/platform/job-processor";
import { buildHandlerMap } from "@/platform/job-handlers";
import { resolveTransactionalEmailPort } from "@/platform/email";
import { handleStripeWebhook } from "@/lib/api/payments";
import type { AppConfig } from "./types";

function openJobQueue(config: AppConfig): SqliteJobQueue {
  const db = new Database(config.db.file);
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  return new SqliteJobQueue(db);
}

export const jobsStats = (config: AppConfig): {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  dead: number;
} => {
  const queue = openJobQueue(config);
  return queue.getStats();
};

export const jobsProcessOnce = async (
  config: AppConfig,
): Promise<{ processed: boolean }> => {
  const queue = openJobQueue(config);
  const handlers = buildHandlerMap({
    emailPort: resolveTransactionalEmailPort(),
    newsletterDispatchFn: async () => {
      // Dynamic import to avoid circular dependencies
      const { dispatchDueNewsletterRuns } = await import("@/lib/api/newsletter");
      return dispatchDueNewsletterRuns();
    },
    discordSyncFn: async () => {
      // No-op placeholder — discord sync needs full context from request
    },
    stripeWebhookFn: async (payload, signature, requestId) => {
      return handleStripeWebhook({ payload, signature, requestId });
    },
  });

  const processor = new JobProcessor(queue, handlers);
  const processed = await processor.tick();
  return { processed };
};

export const jobsProcessPoll = async (
  config: AppConfig,
  intervalMs: number,
): Promise<void> => {
  const queue = openJobQueue(config);
  const handlers = buildHandlerMap({
    emailPort: resolveTransactionalEmailPort(),
    newsletterDispatchFn: async () => {
      const { dispatchDueNewsletterRuns } = await import("@/lib/api/newsletter");
      return dispatchDueNewsletterRuns();
    },
    discordSyncFn: async () => {},
    stripeWebhookFn: async (payload, signature, requestId) => {
      return handleStripeWebhook({ payload, signature, requestId });
    },
  });

  const processor = new JobProcessor(queue, handlers);
  processor.start(intervalMs);

  // Run until SIGINT
  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      processor.stop();
      resolve();
    });
  });
};

export const jobsRetryDead = (config: AppConfig): { retried: number } => {
  const queue = openJobQueue(config);
  const retried = queue.retryDead();
  return { retried };
};

export const jobsPurgeCompleted = (
  config: AppConfig,
  beforeIso: string,
): { purged: number } => {
  const queue = openJobQueue(config);
  const purged = queue.purgeCompleted(beforeIso);
  return { purged };
};
