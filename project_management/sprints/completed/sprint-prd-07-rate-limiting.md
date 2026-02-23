# Sprint PRD-07 — Rate Limiting Hardening

## Severity: HIGH

## Goal
Replace the in-memory rate limiter with a SQLite-backed implementation that persists across restarts, expand rate limiting coverage to all mutation endpoints, and add configurable limits per-route category.

## Why This Is High Priority
The current rate limiter uses a plain `Map<string, RateLimitEntry>` that **resets on every server restart** and **is not shared across instances**. Only 5 out of 65 mutation endpoints are rate-limited. An attacker can exhaust resources on unprotected endpoints (event creation, deal creation, registration, newsletter operations) with no throttling.

## Current State (Evidence)

| What exists | Where |
|-------------|-------|
| In-memory sliding-window rate limiter | `src/lib/api/rate-limit.ts` (~60 lines) |
| `consumeRateLimit(request, key, limit, windowMs)` API | Returns `{ allowed, retryAfterSeconds }` |
| Client ID from `x-forwarded-for` / `x-real-ip` / `"unknown"` | `src/lib/api/rate-limit.ts` |
| `resetRateLimits()` for tests | Same file |
| Only 5 endpoints protected | login, register, verify-request, password-reset-request, event-export |
| All use identical 5/60s limits | No per-route differentiation |

## Scope

### 1. SQLite-Backed Rate Limiter (`platform/rate-limit-store.ts`)
Replace the `Map` with a SQLite table:
```sql
CREATE TABLE rate_limit_entries (
  key TEXT NOT NULL,
  client_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  PRIMARY KEY (key, client_id, timestamp)
);
CREATE INDEX idx_rate_limit_cleanup ON rate_limit_entries(timestamp);
```

Benefits:
- Persists across restarts
- Shareable if app runs multiple processes on same DB
- Automatic cleanup of expired entries

### 2. Rate Limit Configuration
Define per-category limits:
```ts
export const RATE_LIMITS = {
  // Auth: tight limits (abuse target)
  "auth:login":          { limit: 5,  windowMs: 60_000 },
  "auth:register":       { limit: 5,  windowMs: 60_000 },
  "auth:password-reset": { limit: 3,  windowMs: 60_000 },
  "auth:verify":         { limit: 5,  windowMs: 60_000 },
  
  // Admin writes: moderate limits
  "admin:write":         { limit: 30, windowMs: 60_000 },
  
  // User writes: moderate limits
  "user:write":          { limit: 20, windowMs: 60_000 },
  
  // Exports: strict (expensive operations)
  "export":              { limit: 5,  windowMs: 60_000 },
  
  // Webhooks: generous (Stripe sends bursts)
  "webhook":             { limit: 100, windowMs: 60_000 },
  
  // Public reads: lenient
  "public:read":         { limit: 60, windowMs: 60_000 },
} as const;
```

### 3. Rate Limit Middleware Helper
```ts
export function withRateLimit(
  key: keyof typeof RATE_LIMITS,
  handler: RouteHandler,
): RouteHandler {
  return async (req, ctx) => {
    const config = RATE_LIMITS[key];
    const result = consumeRateLimit(req, key, config.limit, config.windowMs);
    if (!result.allowed) {
      return problem({
        type: "rate-limit-exceeded",
        title: "Too Many Requests",
        status: 429,
        detail: `Rate limit exceeded. Retry after ${result.retryAfterSeconds} seconds.`,
      }, req, {
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": String(config.limit),
          "X-RateLimit-Remaining": "0",
        },
      });
    }
    return handler(req, ctx);
  };
}
```

### 4. Apply to All Mutation Routes
- **Auth routes** (5): already protected, update to use new config
- **Admin mutation routes** (~25): apply `"admin:write"` limit
- **User/account mutation routes** (~15): apply `"user:write"` limit
- **Export routes** (~5): apply `"export"` limit
- **Webhook routes** (1): apply `"webhook"` limit
- **Public mutation routes** (~5): apply `"user:write"` limit

### 5. Rate Limit Headers on All Responses
Add `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` to every rate-limited response.

### 6. Cleanup Job
Add a `rate-limit.cleanup` job type (from PRD-06 job queue) that periodically purges expired entries from the SQLite table.

## Non-Goals
- Redis-backed rate limiting (SQLite is sufficient)
- IP reputation / adaptive rate limiting
- Per-user rate limiting (current approach uses IP-based client ID)
- Rate limiting for static assets (CDN concern)

## TDD Process

### Red Phase
1. **SQLite rate limit store tests** (`platform/__tests__/rate-limit-store.test.ts`):
   - Record a request → count is 1
   - Record N requests within window → count is N
   - N+1 request → rejected
   - Wait for window to expire → allowed again
   - Different keys don't interfere
   - Different client IDs don't interfere
   - Cleanup removes expired entries

2. **`withRateLimit()` wrapper tests** (`lib/api/__tests__/rate-limit-wrapper.test.ts`):
   - Under limit → handler called, response returned
   - Over limit → 429 response with Retry-After header
   - Rate limit headers present on success responses
   - Correct category limits applied

3. **Per-route integration tests**:
   - Admin route: 30 requests succeed, 31st → 429
   - Auth route: 5 requests succeed, 6th → 429
   - Export route: 5 requests succeed, 6th → 429

### Green Phase — Implement store + wrapper + apply to routes
### Refactor Phase — DRY route wiring, cleanup scheduled job

## E2E Verification Tests

### Test: "auth endpoints enforce strict rate limits"
```
1. Send 5 POST /api/v1/auth/login requests rapidly
2. Assert: all 5 return 200 or 401 (normal auth response)
3. Send 6th request
4. Assert: 429 with Retry-After header
5. Assert: X-RateLimit-Remaining: 0
```

### Test: "admin endpoints enforce moderate rate limits"
```
1. Login as admin
2. Send 30 POST /api/v1/events requests
3. Assert: all 30 succeed (201)
4. Send 31st request
5. Assert: 429
```

### Test: "rate limits persist across simulated restart"
```
1. Send 4 requests to auth:login
2. Clear in-memory state (simulating restart) but keep SQLite
3. Send 2 more requests
4. Assert: 6th request → 429 (SQLite remembered first 4)
```

### Test: "429 responses include standard rate limit headers"
```
1. Exceed any rate limit
2. Assert: response has X-RateLimit-Limit
3. Assert: response has X-RateLimit-Remaining = 0
4. Assert: response has Retry-After > 0
5. Assert: response is application/problem+json
```

## Acceptance Criteria
- [ ] SQLite-backed rate limit store with migration
- [ ] Configurable per-category rate limits
- [ ] `withRateLimit()` wrapper with standard headers
- [ ] All 65 mutation routes rate-limited
- [ ] Rate limit headers on success responses
- [ ] 429 responses are RFC 7807 problem+json
- [ ] Expired entry cleanup mechanism
- [ ] All existing e2e tests pass (limits generous enough)
- [ ] `npm test`, `npm run lint`, `npm run build` all pass

## End-of-Sprint Verification
```bash
npm test
npm run lint
npm run build
```
