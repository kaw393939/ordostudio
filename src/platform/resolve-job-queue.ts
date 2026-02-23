/**
 * Job queue resolver — singleton access with test seam.
 *
 * The job queue must be explicitly initialized via setJobQueue() before use.
 * This prevents auto-creation in test environments where synchronous
 * processing is expected. In production, app startup configures the queue.
 */
import type { JobQueuePort } from "@/core/ports/job-queue";

let _queue: JobQueuePort | null = null;

/**
 * Get the job queue if one is configured.
 * Returns null when no queue has been set up (e.g., in tests).
 */
export function getJobQueue(): JobQueuePort | null {
  return _queue;
}

/**
 * Resolve the job queue — throws if not configured.
 * Use getJobQueue() for optional/fallback patterns.
 */
export function resolveJobQueue(): JobQueuePort {
  if (!_queue) {
    throw new Error("Job queue not configured. Call setJobQueue() during app initialization.");
  }
  return _queue;
}

/** Set the job queue instance (app startup or tests). */
export function setJobQueue(queue: JobQueuePort): void {
  _queue = queue;
}

/** Reset to no queue (test teardown). */
export function resetJobQueue(): void {
  _queue = null;
}
