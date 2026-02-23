# Sprint PRD-06 — Background Job Runner + Scheduled Tasks

## Severity: HIGH

## Goal
Introduce a lightweight, SQLite-backed job queue so that email delivery, newsletter dispatch, Discord sync, and Stripe webhook processing can run asynchronously with retry logic. Replace the synchronous-only patterns with a fire-and-enqueue model.

## Why This Is High Priority
All async-worthy operations run synchronously inside HTTP request handlers today. Newsletter dispatch requires **manual CLI invocation** — there's no in-process scheduler. If Postmark is slow or Discord's API rate-limits, the user's HTTP request hangs. Failed operations have no retry mechanism. The `newsletter_send_runs` table tracks scheduling but nothing triggers it automatically.

## Current State (Evidence)

| What exists | Where | Problem |
|-------------|-------|---------|
| Newsletter scheduling in DB | `newsletter_send_runs.scheduled_for` column | Nothing dispatches it automatically |
| CLI command to dispatch | `appctl newsletter dispatch-due` in `src/cli/run-cli.ts` line 144 | Must be triggered by external cron |
| Synchronous email sending | `sendNewsletterEmail()` blocks request handler | Slow external API = slow request |
| Synchronous Discord sync | `src/lib/api/entitlements-discord-sync.ts` | Discord API rate limits = slow request |
| Synchronous Stripe webhooks | `src/app/api/v1/webhooks/stripe/route.ts` | Complex processing in webhook handler |
| No retry mechanism | Newsletter has `send_runs` tracking but no retry | Failed sends are permanently lost |
| No job queue library | No Bull, BullMQ, pg-boss, or similar | No async infrastructure |

## Scope

### 1. SQLite Job Queue (`platform/job-queue.ts`)
A lightweight job queue backed by SQLite (no Redis dependency):

```ts
export type JobPayload = {
  type: string;
  data: Record<string, unknown>;
};

export type JobStatus = "pending" | "running" | "completed" | "failed" | "dead";

export interface JobQueue {
  enqueue(job: JobPayload, options?: { runAt?: string; maxRetries?: number }): string;
  processNext(handler: (job: JobPayload) => Promise<void>): Promise<boolean>;
  getStats(): { pending: number; running: number; failed: number; dead: number };
}
```

**SQLite schema** (new migration):
```sql
CREATE TABLE job_queue (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  data TEXT NOT NULL,           -- JSON
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
```

### 2. Job Processor (`platform/job-processor.ts`)
```ts
export class JobProcessor {
  constructor(private queue: JobQueue, private handlers: Map<string, JobHandler>);
  
  // Process one job at a time (poll-based)
  async tick(): Promise<boolean>;
  
  // Start polling loop (for background processing)
  start(intervalMs?: number): void;
  stop(): void;
}
```

Retry strategy:
- Exponential backoff: `delay = baseDelay * 2^attempt` (30s, 60s, 120s)
- After `maxRetries` exceeded → status = `"dead"`, logged as error
- Stale running jobs (> 5 min) → reset to `"pending"` (crash recovery)

### 3. Job Types and Handlers

| Job Type | Data | Handler | Replaces |
|----------|------|---------|----------|
| `email.send` | `{ to, subject, textBody, htmlBody, tag }` | Calls `TransactionalEmailPort.send()` | Synchronous email in auth flows |
| `newsletter.send` | `{ sendRunId }` | Calls existing `dispatchDueNewsletterRuns()` | Manual CLI dispatch |
| `discord.sync` | `{ userId, entitlementIds }` | Calls Discord sync logic | Synchronous Discord API call |
| `stripe.webhook.process` | `{ eventId, eventType, payload }` | Calls existing webhook handlers | Synchronous webhook processing |

### 4. Wire Into Existing Flows

**Auth flows** (from PRD-01):
```ts
// Instead of: await emailPort.send(buildPasswordResetEmail(...))
// Do: jobQueue.enqueue({ type: "email.send", data: buildPasswordResetEmail(...) })
```

**Newsletter dispatch**:
- `scheduleNewsletterSend()` enqueues `newsletter.send` job with `runAt = scheduled_for`
- Remove the manual CLI dispatch pattern (keep CLI command as fallback)

**Discord sync**:
- `syncDiscordEntitlements()` enqueues `discord.sync` instead of calling Discord API inline

**Stripe webhooks**:
- Webhook route acknowledges with 200 immediately
- Enqueues `stripe.webhook.process` for async processing
- Stripe best practice: acknowledge fast, process async

### 5. CLI Job Management Commands
```bash
appctl jobs stats                          # Show queue stats
appctl jobs process --once                 # Process one job (for cron)
appctl jobs process --poll --interval 5000 # Start poll loop
appctl jobs retry-dead                     # Re-enqueue dead jobs
appctl jobs purge-completed --before 7d    # Clean completed jobs
```

### 6. Job Dashboard API
`GET /api/v1/admin/jobs` — returns queue stats + recent failed jobs for the admin UI.

## Non-Goals
- Redis-backed queue (SQLite is sufficient for single-instance)
- Multi-worker / distributed processing
- Priority queues
- Job scheduling UI (CLI is sufficient)
- Real-time job status updates (WebSocket)

## TDD Process

### Red Phase
1. **JobQueue tests** (`platform/__tests__/job-queue.test.ts`):
   - `enqueue()` → job appears in DB with status `"pending"`
   - `processNext()` with handler → status changes to `"completed"`
   - Failed handler → status `"failed"`, `attempts` incremented
   - After max retries → status `"dead"`
   - `runAt` in future → not processed yet
   - `getStats()` returns correct counts
   - Concurrent `processNext()` calls → each gets a different job (SELECT FOR UPDATE pattern)

2. **JobProcessor tests** (`platform/__tests__/job-processor.test.ts`):
   - `tick()` processes one job
   - `tick()` returns false when no jobs available
   - Stale running jobs reset after timeout
   - Unknown job type → logged as error, marked failed

3. **Email job handler tests**:
   - Enqueue `email.send` → handler calls `TransactionalEmailPort.send()`
   - Email port failure → job retried

4. **Stripe webhook async tests**:
   - Webhook route enqueues job → returns 200 immediately
   - Job processor eventually processes the webhook event

### Green Phase — Implement queue + processor + handlers
### Refactor Phase — Extract retry logic, error handling patterns

## E2E Verification Tests

### Test: "password reset email sent via job queue"
```
1. Request password reset via POST /api/v1/auth/password-reset/request
2. Assert: response is immediate (< 100ms)
3. Assert: job queue has 1 pending email.send job
4. Run job processor tick
5. Assert: fake email port received the password reset email
6. Assert: job status is "completed"
```

### Test: "failed email job retries with backoff"
```
1. Configure fake email port to fail
2. Enqueue an email.send job
3. Process tick → fails, attempts=1, status="failed" (or pending with delay)
4. Process tick again → attempts=2
5. After maxRetries → status="dead"
6. Configure email port to succeed
7. Retry dead job → succeeds
```

### Test: "stripe webhook acknowledged fast, processed async"
```
1. POST /api/v1/webhooks/stripe with valid payload
2. Assert: 200 response in < 50ms
3. Assert: job queue has 1 pending stripe.webhook.process job
4. Run job processor tick
5. Assert: webhook event processed (side effects applied)
```

### Test: "job stats API shows queue health"
```
1. Enqueue 3 jobs (2 pending, 1 failed)
2. GET /api/v1/admin/jobs
3. Assert: stats.pending === 2, stats.failed === 1
```

## Acceptance Criteria
- [ ] SQLite-backed job queue with migration
- [ ] `enqueue()` / `processNext()` / `getStats()` API
- [ ] Exponential backoff retry with dead-letter after max retries
- [ ] Stale job recovery (crash recovery)
- [ ] 4 job handlers: email.send, newsletter.send, discord.sync, stripe.webhook.process
- [ ] Auth email flows use job queue (non-blocking)
- [ ] Stripe webhook acknowledges fast, processes async
- [ ] CLI commands for job management
- [ ] Admin API for queue stats
- [ ] All e2e tests pass
- [ ] `npm test`, `npm run lint`, `npm run build` all pass

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```
