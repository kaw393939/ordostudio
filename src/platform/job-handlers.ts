/**
 * Job handlers — typed handler functions for each background job type.
 *
 * Each handler receives a JobPayload and calls the appropriate service.
 * Handlers are registered with the JobProcessor at startup.
 */
import type { JobPayload, JobHandler } from "@/core/ports/job-queue";
import type { TransactionalEmailPort, TransactionalEmailMessage } from "@/core/ports/transactional-email";
import { getLogger } from "@/platform/logger";

/* ── email.send ────────────────────────────────────── */

/**
 * Creates an email.send handler backed by the given email port.
 */
export function createEmailSendHandler(
  emailPort: TransactionalEmailPort,
): JobHandler {
  return async (job: JobPayload) => {
    const data = job.data as unknown as TransactionalEmailMessage;
    const logger = getLogger().child({ jobType: "email.send", to: data.to });

    const result = await emailPort.send(data);
    if (!result.ok) {
      logger.error({ error: result.error }, "email send failed");
      throw new Error(`Email send failed: ${result.error}`);
    }

    logger.info({ messageId: result.messageId }, "email sent via job queue");
  };
}

/* ── newsletter.send ───────────────────────────────── */

/**
 * Creates a newsletter.send handler. Calls the provided dispatch function.
 * The dispatch function should handle its own DB/email orchestration.
 */
export function createNewsletterSendHandler(
  dispatchFn: () => Promise<{ dispatched: number }>,
): JobHandler {
  return async () => {
    const logger = getLogger().child({ jobType: "newsletter.send" });
    const result = await dispatchFn();
    logger.info({ dispatched: result.dispatched }, "newsletter dispatch complete");
  };
}

/* ── discord.sync ──────────────────────────────────── */

/**
 * Creates a discord.sync handler. Calls the provided sync function.
 */
export function createDiscordSyncHandler(
  syncFn: (userId: string, entitlementIds: string[]) => Promise<void>,
): JobHandler {
  return async (job: JobPayload) => {
    const { userId, entitlementIds } = job.data as {
      userId: string;
      entitlementIds: string[];
    };
    const logger = getLogger().child({ jobType: "discord.sync", userId });

    await syncFn(userId, entitlementIds);
    logger.info("discord sync complete");
  };
}

/* ── stripe.webhook.process ────────────────────────── */

/**
 * Creates a stripe.webhook.process handler. Calls the provided webhook
 * processing function with the stored event data.
 */
export function createStripeWebhookHandler(
  processFn: (payload: string, signature: string, requestId: string) => Promise<unknown>,
): JobHandler {
  return async (job: JobPayload) => {
    const { payload, signature, requestId } = job.data as {
      payload: string;
      signature: string;
      requestId: string;
    };
    const logger = getLogger().child({ jobType: "stripe.webhook.process", requestId });

    await processFn(payload, signature, requestId);
    logger.info("stripe webhook processed async");
  };
}

/* ── handler registry ──────────────────────────────── */

/* ── conversation.sweep ────────────────────────────── */

/**
 * Sweeps ACTIVE conversations that have been idle past the abandonment
 * threshold. No dependencies — reads/writes its own DB connection.
 */
export function createConversationSweepHandler(
  sweepFn: (requestId?: string) => { swept: number; contactsCreated: number },
): JobHandler {
  return async (job: JobPayload) => {
    const requestId = typeof job.data.requestId === "string" ? job.data.requestId : undefined;
    const logger = getLogger().child({ jobType: "conversation.sweep" });
    const result = sweepFn(requestId);
    logger.info(result, "conversation sweep complete");
  };
}

export interface HandlerDependencies {
  emailPort: TransactionalEmailPort;
  newsletterDispatchFn: () => Promise<{ dispatched: number }>;
  discordSyncFn: (userId: string, entitlementIds: string[]) => Promise<void>;
  stripeWebhookFn: (payload: string, signature: string, requestId: string) => Promise<unknown>;
  conversationSweepFn: (requestId?: string) => { swept: number; contactsCreated: number };
}

/**
 * Build the full handler map from dependencies.
 */
export function buildHandlerMap(deps: HandlerDependencies): Map<string, JobHandler> {
  const handlers = new Map<string, JobHandler>();
  handlers.set("email.send", createEmailSendHandler(deps.emailPort));
  handlers.set("newsletter.send", createNewsletterSendHandler(deps.newsletterDispatchFn));
  handlers.set("discord.sync", createDiscordSyncHandler(deps.discordSyncFn));
  handlers.set("stripe.webhook.process", createStripeWebhookHandler(deps.stripeWebhookFn));
  handlers.set("conversation.sweep", createConversationSweepHandler(deps.conversationSweepFn));
  return handlers;
}

/**
 * The complete set of job type strings known to the handler registry.
 * Use to construct a `knownTypes` set for SqliteJobQueue so that
 * `enqueue` fails fast on unrecognised type strings.
 */
export const KNOWN_JOB_TYPES = new Set([
  "email.send",
  "newsletter.send",
  "discord.sync",
  "stripe.webhook.process",
  "conversation.sweep",
] as const);
