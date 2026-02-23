/**
 * Email-queue bridge — routes transactional emails through the job queue
 * when available, falling back to direct send when no queue is configured.
 *
 * This preserves backward compatibility: tests that don't set up a job queue
 * continue to work with the direct email port, while production benefits
 * from retry-capable background delivery.
 */
import type { TransactionalEmailMessage, TransactionalEmailPort } from "@/core/ports/transactional-email";
import type { JobQueuePort } from "@/core/ports/job-queue";
import { getLogger } from "@/platform/logger";

let _jobQueue: JobQueuePort | null = null;

/**
 * Set the job queue used for email delivery.
 * When set, emails are enqueued as `email.send` jobs.
 * When null (default / tests), emails are sent directly.
 */
export function setEmailJobQueue(queue: JobQueuePort | null): void {
  _jobQueue = queue;
}

export function resetEmailJobQueue(): void {
  _jobQueue = null;
}

/**
 * Send a transactional email — either via job queue (async with retry)
 * or directly via the email port (immediate, fire-and-forget).
 */
export function sendEmailAsync(
  emailPort: TransactionalEmailPort,
  message: TransactionalEmailMessage,
): void {
  if (_jobQueue) {
    try {
      _jobQueue.enqueue({
        type: "email.send",
        data: message as unknown as Record<string, unknown>,
      });
      getLogger().debug({ to: message.to, tag: message.tag }, "email enqueued");
    } catch (err) {
      // If enqueue fails, fall back to direct send
      getLogger().warn({ err }, "job enqueue failed, falling back to direct send");
      emailPort.send(message).catch(() => {});
    }
  } else {
    // No queue configured — direct fire-and-forget (existing behavior)
    emailPort.send(message).catch(() => {});
  }
}
