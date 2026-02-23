/**
 * Job Queue port — defines the contract for background job processing.
 *
 * The queue accepts typed payloads, persists them, and processes them
 * asynchronously with retry logic and exponential backoff.
 */

export type JobStatus = "pending" | "running" | "completed" | "failed" | "dead";

export interface JobPayload {
  type: string;
  data: Record<string, unknown>;
}

export interface EnqueueOptions {
  /** ISO-8601 timestamp — job won't be processed before this time. */
  runAt?: string;
  /** Maximum retry attempts before the job is marked "dead". Default: 3 */
  maxRetries?: number;
}

export interface JobRecord {
  id: string;
  type: string;
  data: Record<string, unknown>;
  status: JobStatus;
  runAt: string;
  attempts: number;
  maxRetries: number;
  lastError: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
}

export interface JobStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  dead: number;
}

export interface JobQueuePort {
  /** Enqueue a new job. Returns the job ID. */
  enqueue(job: JobPayload, options?: EnqueueOptions): string;

  /**
   * Claim and process the next eligible job.
   * Returns true if a job was processed, false if none available.
   */
  processNext(handler: (job: JobPayload) => Promise<void>): Promise<boolean>;

  /** Return aggregate counts by status. */
  getStats(): JobStats;

  /** Fetch recent failed/dead jobs for monitoring. */
  getRecentFailed(limit?: number): JobRecord[];

  /** Re-enqueue all dead jobs as pending. Returns count re-enqueued. */
  retryDead(): number;

  /** Purge completed jobs older than the given ISO-8601 timestamp. Returns count purged. */
  purgeCompleted(before: string): number;

  /** Reset stale running jobs (crash recovery). Returns count reset. */
  recoverStale(timeoutMs: number): number;
}

export type JobHandler = (payload: JobPayload) => Promise<void>;
