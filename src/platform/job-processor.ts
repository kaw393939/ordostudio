/**
 * Job processor — routes jobs to registered handlers and manages the poll loop.
 *
 * Responsibilities:
 * - Map job types to handler functions
 * - Process one job per tick (poll-based)
 * - Recover stale running jobs on each tick
 * - Provide start/stop for continuous polling
 */
import type { JobQueuePort, JobHandler, JobPayload } from "@/core/ports/job-queue";
import { getLogger } from "@/platform/logger";

const STALE_JOB_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class JobProcessor {
  private handlers: Map<string, JobHandler>;
  private queue: JobQueuePort;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    queue: JobQueuePort,
    handlers: Map<string, JobHandler>,
  ) {
    this.queue = queue;
    this.handlers = handlers;
  }

  /**
   * Process one job from the queue.
   * Returns true if a job was processed, false if none available.
   */
  async tick(): Promise<boolean> {
    // Recover stale jobs first
    const recovered = this.queue.recoverStale(STALE_JOB_TIMEOUT_MS);
    if (recovered > 0) {
      getLogger().warn({ recovered }, "recovered stale running jobs");
    }

    return this.queue.processNext(async (job: JobPayload) => {
      const handler = this.handlers.get(job.type);
      if (!handler) {
        throw new Error(`Unknown job type: ${job.type}`);
      }
      await handler(job);
    });
  }

  /**
   * Start continuous polling at the given interval.
   */
  start(intervalMs = 5000): void {
    if (this.running) return;
    this.running = true;

    const poll = async () => {
      try {
        await this.tick();
      } catch (err) {
        getLogger().error({ err }, "job processor tick error");
      }
    };

    // Run immediately, then on interval
    void poll();
    this.timer = setInterval(() => void poll(), intervalMs);
  }

  /**
   * Stop the polling loop.
   */
  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Whether the processor is currently polling. */
  isRunning(): boolean {
    return this.running;
  }
}
