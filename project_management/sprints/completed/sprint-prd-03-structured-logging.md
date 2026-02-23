# Sprint PRD-03 — Structured Logging + Error Monitoring

## Severity: CRITICAL

## Goal
Enable structured JSON logging across the entire application (CLI + API routes) using Pino, and add an error-reporting port so that unhandled exceptions and caught errors are captured, not silently swallowed.

## Why This Is Critical
The Pino logger in `src/cli/run-cli.ts` is **explicitly disabled** (`enabled: false`). API route catch blocks return `problem+json` to the client but **never log the error server-side**. In production, if a Stripe webhook fails, a DB query throws, or an auth flow breaks — there is zero record of it. No Sentry, no Datadog, no structured log output. Operators are blind.

## Current State (Evidence)

| What exists | Where | Problem |
|-------------|-------|---------|
| Pino imported but disabled | `src/cli/run-cli.ts` line 24: `pino({ enabled: false })` | Logger is a no-op |
| `console.error` in error boundaries | `src/app/error.tsx` line 14, `src/components/error-boundary.tsx` line 29 | Client-side only, no server capture |
| No server-side error logging | All API route catch blocks | Errors returned to client, not recorded |
| CLI output via `io.writeStdout/writeStderr` | `src/cli/run-cli.ts` | Text-only, no structured format |
| Audit log for business events | `src/platform/audit.ts` | Captures mutations, not errors |
| Request IDs generated per mutation | `crypto.randomUUID()` in route handlers | Not propagated through logging |

## Scope

### 1. Application Logger (`platform/logger.ts`)
```ts
import pino from "pino";

export type AppLogger = pino.Logger;

export function createLogger(options?: { level?: string; name?: string }): AppLogger;
export function getRequestLogger(requestId: string, base?: AppLogger): AppLogger;
```

- Reads `LOG_LEVEL` env var (default: `"info"` in prod, `"debug"` in local)
- Reads `LOG_FORMAT` env var: `"json"` (default/prod) or `"pretty"` (local dev)
- Uses `pino-pretty` transport in local dev only
- Always outputs to stdout (12-factor app principle)
- Child loggers carry `requestId` for correlation

### 2. Request Context Logger
Each API route handler gets a logger scoped to the request:
```ts
const log = getRequestLogger(requestId);
log.info({ method: "POST", path: "/api/v1/events" }, "request started");
// ... handler logic ...
log.info({ status: 201 }, "request completed");
```

### 3. Error Logging in Route Handlers
Replace silent catches with structured error logs:
```ts
// BEFORE
catch (err) {
  return problem({ type: "internal-error", title: "Internal Error", status: 500 });
}

// AFTER
catch (err) {
  log.error({ err, requestId }, "unhandled route error");
  return problem({ type: "internal-error", title: "Internal Error", status: 500 }, request);
}
```

### 4. CLI Logger Activation
- Enable the existing Pino logger in `run-cli.ts`
- Wire it through CLI command execution
- Structured output for `--json` mode, human-readable otherwise

### 5. Error Reporting Port (`core/ports/error-reporter.ts`)
```ts
export interface ErrorReporterPort {
  captureException(error: unknown, context?: Record<string, unknown>): void;
  captureMessage(message: string, level: "info" | "warning" | "error", context?: Record<string, unknown>): void;
}
```

### 6. ConsoleErrorReporter (`adapters/console/console-error-reporter.ts`)
- Logs errors via the AppLogger
- Default adapter — no external service needed to start

### 7. SentryErrorReporter (stub adapter only — no Sentry SDK yet)
- `adapters/sentry/sentry-error-reporter.ts` — placeholder that delegates to ConsoleErrorReporter
- Can be swapped in when `SENTRY_DSN` is provided
- Keeping this as a stub avoids adding a heavy dependency now while establishing the seam

### 8. Request Logging Middleware Pattern
Since there's no `middleware.ts` yet (that comes in PRD-04), add a `withRequestLogging()` wrapper:
```ts
export function withRequestLogging(
  handler: (req: Request, ctx: RouteContext) => Promise<Response>,
): (req: Request, ctx: RouteContext) => Promise<Response> {
  return async (req, ctx) => {
    const requestId = crypto.randomUUID();
    const log = getRequestLogger(requestId);
    const start = Date.now();
    log.info({ method: req.method, url: req.url }, "→ request");
    try {
      const res = await handler(req, ctx);
      log.info({ status: res.status, durationMs: Date.now() - start }, "← response");
      return res;
    } catch (err) {
      log.error({ err, durationMs: Date.now() - start }, "✗ unhandled error");
      errorReporter.captureException(err, { requestId, url: req.url });
      return problem({ type: "internal-error", title: "Internal Error", status: 500 }, req);
    }
  };
}
```

## Non-Goals
- Full Sentry SDK integration (just the port + stub adapter)
- Distributed tracing / OpenTelemetry spans (future)
- Log aggregation service setup (operators choose their own)
- Performance monitoring / APM
- Replacing the audit system (audit = business events, logging = operational events)

## TDD Process

### Red Phase
1. **`createLogger()` tests** (`platform/__tests__/logger.test.ts`):
   - Returns a Pino logger instance
   - Respects `LOG_LEVEL` env var
   - Default level is `"info"`
   - `getRequestLogger()` produces child with `requestId` field

2. **`withRequestLogging()` tests** (`lib/api/__tests__/request-logging.test.ts`):
   - Logs request method + URL on entry
   - Logs status + duration on success
   - Logs error + duration on failure
   - Returns 500 problem response on unhandled error
   - Calls error reporter on unhandled error

3. **ErrorReporter port tests** (`core/ports/__tests__/error-reporter.test.ts`):
   - ConsoleErrorReporter captures exceptions via logger
   - ConsoleErrorReporter captures messages via logger
   - FakeErrorReporter records all calls (test double)

4. **CLI logger tests**:
   - Logger is enabled and outputs JSON
   - Command execution logs start/finish

### Green Phase — Implement all modules
### Refactor Phase — Extract common patterns, ensure no `console.error` remains in API routes

## E2E Verification Tests

### Test: "API error produces structured log output"
```
1. Capture stdout during test execution
2. Call an API route that triggers a caught error (e.g., register duplicate email)
3. Assert: stdout contains JSON log line with level "error" or "warn"
4. Assert: log line contains requestId, error type, route path
```

### Test: "successful API call logs request/response"
```
1. Capture stdout
2. POST /api/v1/events (valid)
3. Assert: stdout contains request log (method, path)
4. Assert: stdout contains response log (status, durationMs)
5. Assert: both log lines share the same requestId
```

### Test: "unhandled exception in route returns 500 and logs error"
```
1. Mock a dependency to throw an unexpected Error
2. Call the route
3. Assert: response is 500 with problem+json
4. Assert: error was logged with full stack trace
5. Assert: error reporter was called
```

### Test: "CLI command logs execution context"
```
1. Run a CLI command (e.g., `event list`)
2. Assert: stdout JSON contains command name, duration
3. Assert: logger is enabled (not no-op)
```

## Acceptance Criteria
- [ ] `createLogger()` in `platform/logger.ts` with env-driven config
- [ ] `getRequestLogger()` produces child loggers with `requestId`
- [ ] Pino logger enabled in CLI (`run-cli.ts`)
- [ ] `ErrorReporterPort` interface in `core/ports/`
- [ ] `ConsoleErrorReporter` adapter
- [ ] `FakeErrorReporter` test double
- [ ] `withRequestLogging()` wrapper or equivalent pattern
- [ ] All API route catch blocks log errors (no silent swallowing)
- [ ] Request-scoped `requestId` in all log output
- [ ] No `console.error` in server-side code (replaced with logger)
- [ ] `npm test`, `npm run lint`, `npm run build` all pass

## New Env Vars
| Variable | Default | Purpose |
|----------|---------|---------|
| `LOG_LEVEL` | `"info"` | Pino log level |
| `LOG_FORMAT` | `"json"` | `"json"` or `"pretty"` |

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```
